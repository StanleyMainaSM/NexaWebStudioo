import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  FileText,
  LockKeyhole,
  Handshake,
  CircleDollarSign,
  UserCheck,
  AlertTriangle,
  Scale,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Ban,
  Database,
  BadgeCheck,
} from 'lucide-react';

const POLICY_VERSION = '1.0';

type RuleSection = {
  title: string;
  icon: typeof FileText;
  content: string[];
};

const sections: RuleSection[] = [
  {
    title: '1. Connector Agreement',
    icon: Handshake,
    content: [
      'By becoming an Avelixa Connector, you agree to follow these Connector Rules & Regulations together with any applicable Avelixa policies and agreements.',
      'These rules apply to all Connector activities performed through the Avelixa platform or on behalf of Avelixa.',
      'Applicable Kenyan law and other mandatory legal requirements take precedence over any internal Avelixa policy.',
    ],
  },
  {
    title: '2. Eligibility & Account Responsibilities',
    icon: UserCheck,
    content: [
      'A Connector must provide accurate and complete information during application and account activation.',
      'A Connector must keep their account credentials secure and must not share their account with another person.',
      'A Connector must immediately notify Avelixa if they believe their account has been compromised or accessed without authorization.',
      'A Connector may only use the permissions and features assigned to their account.',
      'A Connector must not attempt to obtain unauthorized access to another Connector, client, operator, administrator, or owner account.',
    ],
  },
  {
    title: '3. Lead Submission Rules',
    icon: FileText,
    content: [
      'A lead must represent a genuine business opportunity and must contain information that the Connector reasonably believes to be accurate.',
      'Connectors must not submit fabricated businesses, fake contacts, automated submissions, or deliberately misleading information.',
      'A Connector should only collect and submit information that is reasonably necessary for the legitimate purpose of evaluating and following up on the business opportunity.',
      'A Connector must not submit a person’s personal information where doing so would unlawfully violate applicable privacy or data-protection requirements.',
      'Avelixa may review, verify, reject, merge, or otherwise investigate submitted leads.',
    ],
  },
  {
    title: '4. Lead Ownership & Duplicate Leads',
    icon: BadgeCheck,
    content: [
      'A lead may be considered a valid Connector lead only after Avelixa verifies that it meets the applicable lead requirements.',
      'Submitting the same business multiple times does not create multiple commission entitlements.',
      'Where substantially identical leads are submitted by different Connectors, Avelixa may investigate the submission history and determine the appropriate attribution.',
      'A Connector must not intentionally submit another Connector’s lead as their own.',
      'Attempts to manipulate lead timestamps, contact information, referral information, or other records are prohibited.',
    ],
  },
  {
    title: '5. Commission Rules',
    icon: CircleDollarSign,
    content: [
      'The Connector commission rate is determined by Avelixa and may be displayed in the Connector Portal.',
      'A commission is earned only when the applicable conditions established by Avelixa have been satisfied.',
      'A submitted lead does not automatically guarantee a commission.',
      'Cancelled, fraudulent, duplicated, disputed, or otherwise invalid transactions may be excluded from commission calculations.',
      'Avelixa may review commission records and correct calculation errors or fraudulent transactions.',
      'Connectors must not promise a specific commission amount to a prospective customer unless that amount has been officially authorized by Avelixa.',
    ],
  },
  {
    title: '6. Business & Customer Conduct',
    icon: UserCheck,
    content: [
      'Connectors must communicate honestly, professionally, and respectfully with prospective customers and businesses.',
      'A Connector must not make false claims about Avelixa, its services, pricing, capabilities, staff, technology, or guarantees.',
      'A Connector must not promise services, discounts, delivery dates, technical capabilities, or contractual terms that have not been authorized by Avelixa.',
      'A Connector must not pressure, threaten, harass, deceive, or otherwise improperly influence a prospective customer.',
      'A Connector must identify themselves truthfully when representing Avelixa.',
    ],
  },
  {
    title: '7. Data Protection & Confidentiality',
    icon: LockKeyhole,
    content: [
      'Personal information obtained through Connector activities must be handled responsibly and only for legitimate purposes.',
      'Connectors must not sell, publish, expose, transfer, or otherwise misuse customer or business personal information.',
      'Personal information must not be copied into unauthorized systems, public websites, social-media posts, or unrelated databases.',
      'Connectors must take reasonable steps to prevent unauthorized access, loss, disclosure, or misuse of information entrusted to them.',
      'If a Connector becomes aware of a suspected data breach, unauthorized disclosure, or loss of personal information, they should report it to Avelixa promptly.',
      'Avelixa processes personal data in accordance with applicable data-protection requirements. Nothing in these rules removes any rights granted to data subjects under applicable law.',
    ],
  },
  {
    title: '8. Anti-Fraud & Anti-Abuse',
    icon: ShieldCheck,
    content: [
      'Fraud, deception, manipulation, impersonation, and deliberate abuse of the Connector system are prohibited.',
      'Connectors must not create or control fake businesses or contacts for the purpose of generating commissions.',
      'Self-referrals or referrals designed primarily to manufacture commission entitlement are prohibited unless expressly authorized by Avelixa.',
      'A Connector must not manipulate lead status, commission information, account information, or other system records.',
      'Attempts to bypass security controls, exploit application vulnerabilities, or access restricted information are prohibited.',
    ],
  },
  {
    title: '9. Avelixa Branding & Representation',
    icon: BadgeCheck,
    content: [
      'A Connector may use Avelixa branding only in the manner authorized by Avelixa.',
      'A Connector must not claim to own Avelixa or represent themselves as an owner, director, administrator, employee, or authorized decision-maker unless that role has actually been granted.',
      'A Connector must not alter official Avelixa materials in a way that creates a misleading impression.',
      'A Connector must not register domains, social-media accounts, businesses, advertisements, or other assets in a manner intended to impersonate Avelixa without authorization.',
    ],
  },
  {
    title: '10. Communication Standards',
    icon: Handshake,
    content: [
      'All business communication must remain professional and relevant to the prospective customer relationship.',
      'Connectors must respect customer requests concerning communication.',
      'Spam, harassment, threats, abusive language, or deceptive communications are prohibited.',
      'A Connector must not disclose confidential internal Avelixa information to a prospective customer or third party without authorization.',
    ],
  },
  {
    title: '11. Prohibited Activities',
    icon: Ban,
    content: [
      'Submitting fake or knowingly inaccurate leads.',
      'Claiming another Connector’s lead as your own.',
      'Sharing or selling customer information without lawful authorization.',
      'Using Avelixa systems for unlawful activity.',
      'Attempting to bypass authentication, authorization, or security controls.',
      'Creating fraudulent accounts or manipulating referrals for financial benefit.',
      'Misrepresenting Avelixa or making unauthorized contractual commitments.',
      'Using confidential Avelixa information for personal or third-party commercial benefit.',
    ],
  },
  {
    title: '12. Security Responsibilities',
    icon: LockKeyhole,
    content: [
      'Keep your password and authentication credentials confidential.',
      'Use only your own Avelixa account.',
      'Do not allow another person to operate your Connector account.',
      'Use secure devices and networks where reasonably possible.',
      'Report suspected unauthorized access or security incidents to Avelixa promptly.',
      'Avelixa may restrict access where necessary to protect users, customers, systems, or business information.',
    ],
  },
  {
    title: '13. Suspension & Termination',
    icon: AlertTriangle,
    content: [
      'Avelixa may suspend or restrict a Connector account where there is a reasonable concern involving fraud, security, misuse, misconduct, or violation of these rules.',
      'Avelixa may investigate suspected violations and may request information relevant to the investigation.',
      'Serious or repeated violations may result in termination of Connector access.',
      'Termination does not prevent Avelixa from pursuing any lawful remedy available to it.',
      'Where appropriate, Avelixa may review legitimate outstanding commission amounts separately from the account termination decision.',
    ],
  },
  {
    title: '14. Disputes & Reviews',
    icon: Scale,
    content: [
      'A Connector may raise a genuine dispute concerning a lead, commission, account action, or other Connector matter through the official Avelixa communication channels.',
      'Avelixa may request supporting information when reviewing a dispute.',
      'Internal review does not remove any rights or remedies available to a person under applicable Kenyan law.',
      'Where a matter concerns personal-data rights, applicable data-protection complaint and enforcement mechanisms remain available.',
    ],
  },
  {
    title: '15. Legal & Regulatory Compliance',
    icon: Scale,
    content: [
      'Connectors must comply with applicable Kenyan laws and regulations while performing Connector activities.',
      'This includes applicable requirements relating to privacy and data protection, consumer protection, electronic communications, cybersecurity, fraud prevention, and other laws relevant to the Connector’s activities.',
      'Nothing in these rules authorizes a Connector to process personal information unlawfully or to make representations that would breach applicable consumer-protection requirements.',
      'Where applicable law changes, Avelixa may update these rules to reflect the new requirements.',
    ],
  },
  {
    title: '16. Policy Changes',
    icon: Clock3,
    content: [
      'Avelixa may update these Connector Rules & Regulations when business processes, technology, security requirements, or applicable law changes.',
      'Material changes may require the Connector to review and accept the updated version before continuing to use Connector functionality.',
      'The policy version and acceptance date should be retained as part of the Connector’s account records where the applicable acceptance system is enabled.',
    ],
  },
];

export default function ConnectorRules() {
  const storageKey = 'avelixa_connector_rules_acceptance';

  const [expanded, setExpanded] = useState<number | null>(0);
  const [accepted, setAccepted] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);

      if (
        parsed?.version === POLICY_VERSION &&
        parsed?.accepted === true
      ) {
        setAccepted(true);
        setAcceptedAt(parsed.acceptedAt || null);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, []);

  const handleAcceptance = () => {
    const timestamp = new Date().toISOString();

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        accepted: true,
        version: POLICY_VERSION,
        acceptedAt: timestamp,
      })
    );

    setAccepted(true);
    setAcceptedAt(timestamp);
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent-500">
          Connector Portal
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Rules & Regulations
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          These rules establish the standards that apply to Avelixa
          Connectors when identifying businesses, submitting leads,
          communicating with prospective customers, and using the
          Connector Portal.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-xs font-medium text-accent-400">
            <FileText className="h-3.5 w-3.5" />
            Policy version {POLICY_VERSION}
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-ink-800/50 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400">
            <Scale className="h-3.5 w-3.5" />
            Applicable law prevails
          </span>
        </div>
      </div>

      {/* IMPORTANT NOTICE */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

          <div>
            <h2 className="font-semibold text-white">
              Important notice
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              These are Avelixa's internal Connector rules and
              operating standards. They do not replace applicable
              legislation, regulations, contractual obligations,
              professional advice, or rights available under Kenyan
              law.
            </p>
          </div>
        </div>
      </div>

      {/* RULES */}
      <div className="space-y-3">
        {sections.map((section, index) => {
          const Icon = section.icon;
          const isOpen = expanded === index;

          return (
            <div
              key={section.title}
              className="overflow-hidden rounded-2xl border border-ink-800/50 bg-white/[0.02]"
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded(isOpen ? null : index)
                }
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-xl bg-accent-500/10 p-2.5">
                    <Icon className="h-5 w-5 text-accent-400" />
                  </div>

                  <span className="font-medium text-white">
                    {section.title}
                  </span>
                </div>

                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-white/5 px-5 pb-6 pt-5">
                  <div className="space-y-3 pl-0 md:pl-[3.5rem]">
                    {section.content.map(
                      (paragraph, paragraphIndex) => (
                        <div
                          key={`${section.title}-${paragraphIndex}`}
                          className="flex gap-3"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />

                          <p className="text-sm leading-6 text-gray-400">
                            {paragraph}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ACCEPTANCE */}
      <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-accent-500/10 p-3">
            {accepted ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            ) : (
              <Database className="h-6 w-6 text-accent-400" />
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">
              Connector acknowledgement
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Please read the rules above before accepting them.
              Acceptance confirms that you have reviewed the current
              Avelixa Connector Rules & Regulations.
            </p>

            {accepted ? (
              <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Rules acknowledged
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Version {POLICY_VERSION}
                  {acceptedAt
                    ? ` • ${new Date(acceptedAt).toLocaleString(
                        'en-GB'
                      )}`
                    : ''}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAcceptance}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-500"
              >
                <CheckCircle2 className="h-4 w-4" />
                I Have Read and Acknowledge These Rules
              </button>
            )}

            <p className="mt-4 text-xs leading-5 text-gray-500">
              Note: this acknowledgement is currently stored locally
              in this browser. A server-side acceptance record should
              be added before production launch if Avelixa requires
              a formal audit trail.
            </p>
          </div>
        </div>
      </div>

      {/* DATA PROTECTION REMINDER */}
      <div className="rounded-2xl border border-ink-800/50 bg-white/[0.02] p-6">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-accent-400" />

          <div>
            <h3 className="font-semibold text-white">
              Data protection reminder
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Connector activities may involve business contact
              information and other personal data. Handle such
              information only for legitimate purposes, keep it
              secure, and do not disclose it outside authorized
              purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
