import React from "react";
import { Mail, User } from "lucide-react";

const KeyContacts = ({ contacts }) => {
  if (!contacts || contacts.length === 0) return null;

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-brand-purple-100 bg-gradient-to-br from-brand-purple-50/50 to-white shadow-sm">
      <div className="border-b border-brand-purple-100 bg-white/50 px-6 py-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-royal-blue flex items-center gap-2">
          <User className="w-4 h-4" />
          Who's Who: Key Contacts
        </h3>
      </div>
      <div className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x snap-mandatory">
          {contacts.map((contact, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 rounded-xl border border-brand-purple-50 bg-white/60 p-4 shadow-sm transition-all hover:shadow-md hover:border-brand-royal-blue/30 hover:bg-white group min-w-[280px] max-w-[320px] snap-start shrink-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-gray/60 mb-0.5 truncate" title={contact.institution}>
                  {contact.institution}
                </p>
                <p className="font-bold text-brand-royal-blue truncate" title={contact.name}>
                  {contact.name}
                </p>
                <a
                  href={`mailto:${contact.email}`}
                  className="mt-2 flex items-center gap-1.5 text-sm font-medium text-brand-gray hover:text-brand-royal-blue transition-colors overflow-hidden"
                  title={contact.email}
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyContacts;
