import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '~/components/Navbar';
import { usePuterStore } from '~/lib/puter';

interface ResumeData {
  id: string;
  resumePath: string;
  imagePath: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  feedback: any;
}

const WipeApp = () => {
  const { auth, isLoading, error, fs, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadResumes = async () => {
    const keys = await kv.list('resumeId:*');
    if (!keys) return;

    const keyStrings = keys.map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      return item.key;
    });

    const resumePromises = keyStrings.map((key) => kv.get(key));
    const resumeDataStrings = await Promise.all(resumePromises);
    const resumesData = resumeDataStrings
      .map((s) => {
        if (s) {
          try {
            return JSON.parse(s);
          } catch (e) {
            return null;
          }
        }
        return null;
      })
      .filter(Boolean) as ResumeData[];
    setResumes(resumesData);
  };

  useEffect(() => {
    if (!isLoading && auth.isAuthenticated) {
      loadResumes();
    }
  }, [isLoading, auth.isAuthenticated]);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate('/auth?next=/wipe');
    }
  }, [isLoading, auth.isAuthenticated]);

  const handleDelete = async (resume: ResumeData) => {
    setIsDeleting(resume.id);
    try {
      await fs.delete(resume.resumePath);
      await fs.delete(resume.imagePath);
      await kv.delete(`resumeId:${resume.id}`);
      setResumes(resumes.filter((r) => r.id !== resume.id));
    } catch (e) {
      console.error('Failed to delete resume', e);
      // Here you could set an error state to show a message to the user
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
        <Navbar />
        <section className="main-section">
          <div className="page-heading py-16">
            <h1>Loading...</h1>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
        <Navbar />
        <section className="main-section">
          <div className="page-heading py-16">
            <h1>Error</h1>
            <p>{error}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Manage Your Resumes</h1>
          <h2>Here you can view and delete your uploaded resumes.</h2>
        </div>
        <div className="mt-8 flex flex-col gap-4 pb-16">
          {resumes.length === 0 && !isLoading ? (
            <p className="text-center">No resumes found.</p>
          ) : (
            resumes.map((resume) => (
              <div
                key={resume.id}
                className="bg-white bg-opacity-10 p-4 rounded-lg flex flex-col md:flex-row justify-between md:items-center gap-4"
              >
                <div className="flex-grow">
                  <p className="font-bold text-lg">{resume.jobTitle}</p>
                  <p className="text-sm">at {resume.companyName}</p>
                </div>
                <button
                  className="bg-red-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-red-700 transition-colors disabled:bg-gray-500"
                  onClick={() => handleDelete(resume)}
                  disabled={isDeleting === resume.id}
                >
                  {isDeleting === resume.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
};

export default WipeApp;
