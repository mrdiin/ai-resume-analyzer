import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import ResumeCard from '~/components/ResumeCard';
import { usePuterStore } from '~/lib/puter';
import Navbar from '../components/Navbar';
import type { Route } from './+types/home';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Resumind' }, { name: 'description', content: 'Smart feedback for your dream job!' }];
}

export default function Home() {
  const { auth, kv } = usePuterStore();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated) navigate('/auth?next=/');
  }, [auth.isAuthenticated]);

  useEffect(() => {
    const loadResumes = async () => {
      setIsLoading(true);
      const resumes = (await kv.list('resumeId:*', true)) as KVItem[];
      const parsedResumes = resumes?.map((resume) => JSON.parse(resume.value) as Resume);

      setResumes(parsedResumes || []);
      setIsLoading(false);
    };

    loadResumes();
  }, []);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Track Your Applications & Resume Ratings</h1>
          {!isLoading && resumes?.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback</h2>
          ) : (
            <h2>Review your submissions and check AI-powered feedback</h2>
          )}
          {isLoading && (
            <div className="flex flex-col items-center justify-center">
              <img src="/images/resume-scan-2.gif" alt="resume-scan" className="w-[200px] h-[200px]" />
            </div>
          )}
        </div>

        {!isLoading && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume: Resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}

        {!isLoading && resumes.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
