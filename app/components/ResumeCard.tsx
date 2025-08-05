import { Link, useNavigate } from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";

const ResumeCard = ({
  resume: { id, companyName, jobTitle, feedback, imagePath, resumePath },
}: {
  resume: Resume;
}) => {
  const { fs, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumeUrl, setResumeUrl] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadResume = async () => {
      try {
        const blob = await fs.read(imagePath);
        if (!blob) {
          console.warn(`Could not load image: ${imagePath}`);
          return;
        }
        let url = URL.createObjectURL(blob);
        setResumeUrl(url);
      } catch (error) {
        console.error(`Error loading resume image: ${imagePath}`, error);
        // Set a placeholder or default image
        setResumeUrl("/images/pdf.png");
      }
    };

    loadResume();
  }, [imagePath, fs]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !confirm(
        "Are you sure you want to delete this resume? This action cannot be undone."
      )
    ) {
      return;
    }

    console.log("Starting delete process for resume:", {
      id,
      resumePath,
      imagePath,
    });
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

      // Refresh the page to update the resume list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting resume:", error);
      alert("Failed to delete resume. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Link
      to={`/resume/${id}`}
      className="resume-card animate-in fade-in duration-1000"
    >
      <div className="resume-card-header">
        <div className="flex flex-col gap-2">
          {companyName && (
            <h2 className="!text-white font-bold break-words">{companyName}</h2>
          )}
          {jobTitle && (
            <h3 className="text-lg break-words text-gray-300">{jobTitle}</h3>
          )}
          {!companyName && !jobTitle && (
            <h2 className="!text-white font-bold">Resume</h2>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex-shrink-0">
            <ScoreCircle score={feedback.overallScore} />
          </div>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete resume"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
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
          </button>
        </div>
      </div>
      <div className="gradient-border animate-in fade-in duration-1000">
        <div className="w-full h-full">
          {resumeUrl ? (
            <img
              src={resumeUrl}
              alt="resume"
              className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
            />
          ) : (
            <div className="w-full h-[350px] max-sm:h-[200px] flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center">
                <img
                  src="/images/pdf.png"
                  alt="PDF"
                  className="w-16 h-16 mx-auto mb-2"
                />
                <p className="text-gray-500">Resume Preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
export default ResumeCard;
