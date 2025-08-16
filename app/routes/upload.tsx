import { prepareInstructions } from 'constants/index';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import Alert from '~/components/Alert';
import FileUploader from '~/components/FileUploader';
import Navbar from '~/components/Navbar';
import { convertPdfToImage } from '~/lib/pdf2img';
import { usePuterStore } from '~/lib/puter';
import { generateUUID } from '~/lib/utils';

const upload = () => {
  const { fs, ai, kv } = usePuterStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0); // For resetting the form
  const navigate = useNavigate();

  const handleFileSelect = (file: File | null) => {
    setFile(file);
    setError(null);
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setIsProcessing(true);
    setError(null);
    setStatusText('Starting analysis...');

    let uploadedFile: FSItem | undefined;
    let uploadedImage: FSItem | undefined;
    let uuid: string | null = null;

    try {
      setStatusText('Uploading your resume...');
      uploadedFile = await fs.upload([file]);
      if (!uploadedFile) {
        throw new Error('Failed to upload your resume.');
      }

      setStatusText('Converting your resume to an image...');
      const imageFile = await convertPdfToImage(file);
      if (!imageFile.file) {
        throw new Error('Failed to convert your resume to an image.');
      }

      setStatusText('Uploading your resume image...');
      uploadedImage = await fs.upload([imageFile.file]);
      if (!uploadedImage) {
        throw new Error('Failed to upload your resume image.');
      }

      setStatusText('Analyzing your resume...');
      uuid = generateUUID();
      const data = {
        id: uuid,
        resumePath: uploadedFile.path,
        imagePath: uploadedImage.path,
        companyName,
        jobTitle,
        jobDescription,
        feedback: ''
      };

      await kv.set(`resumeId:${uuid}`, JSON.stringify(data));

      setStatusText('Your resume is being analyzed...');
      const feedback = await ai.feedback(
        uploadedFile.path,
        prepareInstructions({
          jobTitle,
          jobDescription
        })
      );

      if (!feedback || !feedback.message || !feedback.message.content) {
        throw new Error('Failed to get analysis feedback.');
      }

      const feedbackText =
        typeof feedback.message.content === 'string'
          ? feedback.message.content
          : feedback.message.content[0].text;

      data.feedback = JSON.parse(feedbackText);

      await kv.set(`resumeId:${uuid}`, JSON.stringify(data));

      setStatusText('Your resume is analyzed! Redirecting to the results page...');
      navigate(`/resume/${uuid}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setStatusText('An error occurred during analysis.');
      setError(errorMessage);

      // Cleanup
      const cleanupPromises = [];
      if (uploadedFile) {
        cleanupPromises.push(fs.delete(uploadedFile.path));
      }
      if (uploadedImage) {
        cleanupPromises.push(fs.delete(uploadedImage.path));
      }
      if (uuid) {
        cleanupPromises.push(kv.delete(`resumeId:${uuid}`));
      }
      if (cleanupPromises.length > 0) await Promise.all(cleanupPromises);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest('form');
    if (!form) return;
    const formData = new FormData(form);

    const companyName = formData.get('company-name') as string;
    const jobTitle = formData.get('job-title') as string;
    const jobDescription = formData.get('job-description') as string;

    if (!file) {
      setError('Please select a resume file to upload.');
      return;
    }

    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  const handleTryAgain = () => {
    setIsProcessing(false);
    setError(null);
    setFile(null);
    setFormKey((k) => k + 1);
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart Feedback for your dream job</h1>
          {isProcessing ? (
            <div className="w-full text-center">
              <h2>{statusText}</h2>
              {error ? (
                <div className="mt-4 flex flex-col items-center gap-4">
                  <Alert message={error} />
                  <button className="primary-button" onClick={handleTryAgain}>
                    Try Again
                  </button>
                </div>
              ) : (
                <img src="/images/resume-scan.gif" className="w-full" />
              )}
            </div>
          ) : (
            <>
              <h2>Drop your resume for an ATS score and improvement tips</h2>
              {error && (
                <div className="mt-4">
                  <Alert message={error} />
                </div>
              )}
            </>
          )}
          {!isProcessing && (
            <form key={formKey} id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input id="company-name" type="text" name="company-name" placeholder="Company Name" />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input id="job-title" type="text" name="job-title" placeholder="Job Title" />
              </div>
              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea id="job-description" rows={5} name="job-description" placeholder="Job Description" />
              </div>
              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>
              <button className="primary-button" type="submit">
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default upload;