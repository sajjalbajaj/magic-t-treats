import type { Metadata } from "next";

import { getSettings } from "@/lib/data/content";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Magic T-treats collects, uses and protects the information you share with us.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default async function PrivacyPage() {
  const general = await getSettings("general");
  const updated = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="container-page section-y">
      <article className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl">Privacy Policy</h1>
          <p className="text-sm text-ink-muted">Last updated {updated}</p>
        </header>

        <Section title="What we collect">
          <p>
            When you send an enquiry we store what you type into the form: your name, the treat you
            asked about, quantity, the date you need it, your delivery or pickup preference, any
            customisation notes, and a phone number or email address if you choose to give one.
          </p>
          <p>
            We also record how you found us: the campaign or link you arrived from, the page you
            came from, and whether you were on a phone, tablet or computer. This is first-party
            measurement kept for the duration of your visit only.
          </p>
        </Section>

        <Section title="Why we collect it">
          <p>
            To reply to your enquiry, prepare your order, and understand which treats people ask
            about most. We do not sell your information, and we do not share it with anyone except
            the services we use to run the website.
          </p>
        </Section>

        <Section title="Who processes it">
          <p>
            The website runs on Vercel and the database and file storage are provided by Supabase.
            If analytics is enabled, aggregate traffic data is processed by Google Analytics. Each
            of these providers processes data on our behalf under their own terms.
          </p>
        </Section>

        <Section title="Instagram and WhatsApp">
          <p>
            Enquiries continue as a normal chat on Instagram or WhatsApp. Once you send that
            message, the conversation is governed by that platform&rsquo;s own privacy policy, not
            this one.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Enquiries and orders are retained as business records so we can honour repeat orders
            and understand demand over time. You may ask us to delete your enquiry at any time.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            Write to us and we will tell you what we hold about you, correct it, or delete it.
            {general.email ? (
              <>
                {" "}
                Reach us at{" "}
                <a
                  href={`mailto:${general.email}`}
                  className="font-semibold text-cocoa underline underline-offset-2"
                >
                  {general.email}
                </a>
                .
              </>
            ) : (
              " The quickest way to reach us is a direct message on Instagram."
            )}
          </p>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-display text-2xl text-cocoa">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}
