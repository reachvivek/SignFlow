import { Link } from "@remix-run/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faPenToSquare,
  faCircleCheck,
  faCircleXmark,
  faEye,
  faClipboardCheck,
} from "@fortawesome/free-solid-svg-icons";
import type { Document } from "~/types";

interface DocumentCardProps {
  document: Document;
  role: "uploader" | "signer";
}

export default function DocumentCard({ document, role }: DocumentCardProps) {
  // Normalize status to lowercase for consistent matching
  const status = document.status?.toLowerCase() || 'pending';

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    signed: "bg-blue-100 text-blue-800",
    verified: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const statusIcons = {
    pending: faClock,
    signed: faPenToSquare,
    verified: faCircleCheck,
    rejected: faCircleXmark,
  };

  const formattedDate = new Date(document.createdAt).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <svg
              className="w-10 h-10 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {document.name}
              </h3>
              <p className="text-sm text-gray-500">
                {role === "uploader"
                  ? `Assigned to: ${document.assignedTo || "Unknown"}`
                  : `Uploaded by uploader`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 mt-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                statusColors[status]
              }`}
            >
              <FontAwesomeIcon icon={statusIcons[status]} className="w-3 h-3" />
              {status.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">{formattedDate}</span>
          </div>
        </div>

        <div className="flex flex-col space-y-2 min-w-[120px]">
          {role === "signer" && status === "pending" && (
            <Link
              to={`/signer/sign/${document.id}`}
              className="btn-primary text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4" />
              <span>Sign Now</span>
            </Link>
          )}
          {role === "uploader" && status === "signed" && (
            <Link
              to={`/uploader/review/${document.id}`}
              className="btn-primary text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faClipboardCheck} className="w-4 h-4" />
              <span>Review</span>
            </Link>
          )}
          <Link
            to={`/api/documents/${document.id}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
            <span>View PDF</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
