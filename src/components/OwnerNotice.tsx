import { ExternalLink } from 'lucide-react';

interface OwnerNoticeProps {
  ownerName: string;
  website: string;
  contactEmail?: string;
}

export default function OwnerNotice({ ownerName, website, contactEmail }: OwnerNoticeProps) {
  return (
    <div className="mt-8 py-6 border-t border-neutral-800/50">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-neutral-500 font-medium">
        <div className="flex items-center gap-1.5">
          <span>A product by</span>
          <a 
            href={website}
            target="_blank" 
            rel="noreferrer"
            className="text-neutral-300 hover:text-white transition-colors"
          >
            {ownerName}
          </a>
        </div>
        
        <div className="flex items-center gap-6">
          <a
            href={website}
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-300 transition-colors flex items-center gap-1.5"
          >
            Visit Website
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="hover:text-neutral-300 transition-colors"
            >
              Contact
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
