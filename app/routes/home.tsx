import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const { auth, kv, puterReady, isLoading } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  // Temporarily commented out for testing
  // useEffect(() => {
  //   if(!auth.isAuthenticated) navigate('/auth?next=/');
  // }, [auth.isAuthenticated])

  useEffect(() => {
    // Only load resumes if user is authenticated
    if (!auth.isAuthenticated) {
      console.log("User not authenticated, clearing resumes");
      setResumes([]);
      setLoadingResumes(false);
      return;
    }

    const loadResumes = async () => {
      console.log("Loading resumes for authenticated user...");
      setLoadingResumes(true);

      try {
        const resumes = (await kv.list("resume:*", true)) as KVItem[];
        console.log("Found resumes:", resumes?.length || 0);

        const parsedResumes = resumes
          ?.map((resume) => {
            try {
              // Check if the value is valid JSON
              if (!resume.value || resume.value.trim() === "") {
                console.warn("Empty resume value found:", resume.key);
                return null;
              }

              const parsed = JSON.parse(resume.value) as Resume;

              // Validate the parsed data has required fields
              if (!parsed.id || !parsed.feedback) {
                console.warn("Invalid resume data found:", resume.key, parsed);
                return null;
              }

              return parsed;
            } catch (parseError) {
              console.error("Failed to parse resume:", resume.key, parseError);
              console.log("Raw value:", resume.value);
              return null;
            }
          })
          .filter(Boolean) as Resume[]; // Remove null values

        console.log("Parsed resumes:", parsedResumes);
        setResumes(parsedResumes || []);

        // Clean up corrupted data
        if (resumes && resumes.length > 0) {
          const validKeys = parsedResumes.map((r) => `resume:${r.id}`);
          const allKeys = resumes.map((r) => r.key);
          const corruptedKeys = allKeys.filter(
            (key) => !validKeys.includes(key)
          );

          if (corruptedKeys.length > 0) {
            console.log("Cleaning up corrupted resume data:", corruptedKeys);
            for (const key of corruptedKeys) {
              try {
                // Use kv.set with empty string instead of kv.delete
                await kv.set(key, "");
                console.log("Cleared corrupted data:", key);
              } catch (error) {
                console.warn("Failed to clear corrupted data:", key, error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading resumes:", error);
        setResumes([]);
      } finally {
        setLoadingResumes(false);
      }
    };

    loadResumes();
  }, [auth.isAuthenticated, kv]);

  // Show loading while Puter is initializing
  if (isLoading || !puterReady) {
    return (
      <main className="bg-[url('/images/bg-main.svg')] bg-cover">
        <Navbar />
        <section className="main-section">
          <div className="page-heading py-16">
            <h1>Loading...</h1>
            <h2>Initializing your resume analyzer</h2>
          </div>
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
        </section>
      </main>
    );
  }

  // Debug information
  console.log("Auth status:", {
    isAuthenticated: auth.isAuthenticated,
    isLoading,
    puterReady,
    loadingResumes,
    resumesCount: resumes.length,
  });

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Track Your Applications & Resume Ratings</h1>
          {!auth.isAuthenticated ? (
            <h2>Sign in to start analyzing your resumes</h2>
          ) : !loadingResumes && resumes?.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback.</h2>
          ) : (
            <h2>Review your submissions and check AI-powered feedback.</h2>
          )}
        </div>
        {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}

        {!auth.isAuthenticated ? (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <button
              onClick={auth.signIn}
              className="primary-button w-fit text-xl font-semibold"
            >
              Sign In to Continue
            </button>
          </div>
        ) : (
          !loadingResumes &&
          resumes?.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-10 gap-4">
              <Link
                to="/upload"
                className="primary-button w-fit text-xl font-semibold"
              >
                Upload Resume
              </Link>
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    try {
                      const allResumes = await kv.list("resume:*", true);
                      console.log("All resume keys:", allResumes);
                      if (allResumes && allResumes.length > 0) {
                        alert(
                          `Found ${allResumes.length} resume entries. Check console for details.`
                        );
                      } else {
                        alert("No resume entries found.");
                      }
                    } catch (error) {
                      console.error("Error checking resumes:", error);
                      alert("Error checking resumes. See console for details.");
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Debug: Check Resume Data
                </button>
                <button
                  onClick={async () => {
                    if (
                      confirm("This will clear ALL resume data. Are you sure?")
                    ) {
                      try {
                        const allResumes = await kv.list("resume:*", true);
                        if (allResumes && allResumes.length > 0) {
                          for (const resume of allResumes) {
                            const key =
                              typeof resume === "string" ? resume : resume.key;
                            await kv.set(key, "");
                          }
                          alert(`Cleared ${allResumes.length} resume entries.`);
                          window.location.reload();
                        } else {
                          alert("No resume entries to clear.");
                        }
                      } catch (error) {
                        console.error("Error clearing resumes:", error);
                        alert(
                          "Error clearing resumes. See console for details."
                        );
                      }
                    }
                  }}
                  className="text-sm text-red-500 hover:text-red-700 underline"
                >
                  Clear All Resume Data
                </button>
              </div>
            </div>
          )
        )}
      </section>
    </main>
  );
}
