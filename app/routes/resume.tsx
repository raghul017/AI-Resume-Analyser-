import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => [
  { title: "Resumind | Review " },
  { name: "description", content: "Detailed overview of your resume" },
];

const Resume = () => {
  const { auth, isLoading, fs, kv } = usePuterStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated)
      navigate(`/auth?next=/resume/${id}`);
  }, [isLoading]);

  useEffect(() => {
    const loadResume = async () => {
      try {
        const resume = await kv.get(`resume:${id}`);

        if (!resume) {
          console.error(`Resume not found: ${id}`);
          return;
        }

        const data = JSON.parse(resume);
        setResumeData(data);
        console.log("Resume data:", data);

        try {
          const resumeBlob = await fs.read(data.resumePath);
          if (!resumeBlob) {
            console.warn(`Could not load PDF: ${data.resumePath}`);
          } else {
            const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
            const resumeUrl = URL.createObjectURL(pdfBlob);
            setResumeUrl(resumeUrl);
          }
        } catch (error) {
          console.error(`Error loading PDF: ${data.resumePath}`, error);
        }

        try {
          const imageBlob = await fs.read(data.imagePath);
          if (!imageBlob) {
            console.warn(`Could not load image: ${data.imagePath}`);
          } else {
            const imageUrl = URL.createObjectURL(imageBlob);
            setImageUrl(imageUrl);
          }
        } catch (error) {
          console.error(`Error loading image: ${data.imagePath}`, error);
        }

        setFeedback(data.feedback);
        console.log({ resumeUrl, imageUrl, feedback: data.feedback });
      } catch (error) {
        console.error("Error loading resume:", error);
      }
    };

    loadResume();
  }, [id, kv, fs]);

  const handleDelete = async () => {
    if (!resumeData) return;

    if (
      !confirm(
        "Are you sure you want to delete this resume? This action cannot be undone."
      )
    ) {
      return;
    }

    console.log("Starting delete process for resume:", { id, resumeData });
    setIsDeleting(true);

    try {
      // Simple delete using KV set with empty string
      console.log("Deleting resume data from KV store:", `resume:${id}`);

      try {
        // Set the value to empty string to effectively "delete" it
        await kv.set(`resume:${id}`, "");
        console.log("Resume data cleared successfully");
      } catch (setError) {
        console.error("Failed to clear resume data:", setError);
        throw new Error("Failed to delete resume");
      }

      // Show success message
      alert("Resume deleted successfully!");

      // Navigate back to home page
      navigate("/");
    } catch (error) {
      console.error("Error deleting resume:", error);
      alert("Failed to delete resume. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">
            Back to Homepage
          </span>
        </Link>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="Delete resume"
        >
          {isDeleting ? (
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          )}
          <span className="text-sm font-semibold">
            {isDeleting ? "Deleting..." : "Delete Resume"}
          </span>
        </button>
      </nav>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center">
          <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
            {imageUrl && resumeUrl ? (
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  title="resume"
                />
              </a>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl">
                <div className="text-center">
                  <img
                    src="/images/pdf.png"
                    alt="PDF"
                    className="w-24 h-24 mx-auto mb-4"
                  />
                  <p className="text-gray-500 text-lg">Resume Preview</p>
                  <p className="text-gray-400 text-sm">
                    File may be unavailable
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
        <section className="feedback-section">
          <h2 className="text-4xl !text-white font-bold">Resume Review</h2>
          {feedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={feedback} />
              <ATS
                score={feedback.ATS.score || 0}
                suggestions={feedback.ATS.tips || []}
              />
              <Details feedback={feedback} />
            </div>
          ) : (
            <img src="/images/resume-scan-2.gif" className="w-full" />
          )}
        </section>
      </div>
    </main>
  );
};
export default Resume;
