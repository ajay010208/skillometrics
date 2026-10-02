import { GlassCard } from "../components/ui";

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: October 2026 · SkilloMetrics is an early-stage platform built for
          Smart India Hackathon 2025 (Problem 26135). This page describes what we actually do
          today — not aspirational legal language.
        </p>
      </div>

      <GlassCard className="space-y-4 p-6 text-sm leading-relaxed text-slate-600">
        <section>
          <h2 className="section-title">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <b>Sign-in data:</b> your email address when you sign in with a magic link, or the
              email and basic profile (name, avatar) that Google / GitHub / LinkedIn share when you
              use one-click sign-in. Sign-in itself is handled by Supabase Auth.
            </li>
            <li>
              <b>Profile data you enter:</b> name, phone, skills, target job, resume text you
              upload, and links (LinkedIn / GitHub / portfolio).
            </li>
            <li>
              <b>Platform activity:</b> quiz attempts, skill assessments, roadmap progress, saved
              jobs, placement records, and the 3/6/12-month follow-up check-ins you submit.
            </li>
            <li>
              <b>Chat messages</b> you send to the AI counsellor, so the conversation works.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="section-title">How we use it</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>To build your verified profile, run the reality check and generate your roadmap.</li>
            <li>To match you with jobs and let recruiters find you by validated skills and projects.</li>
            <li>
              To produce aggregate, anonymised outcome analytics (placement rates, skill gaps) for
              training providers and government dashboards.
            </li>
          </ul>
          <p className="mt-2">
            Recruiters using the platform can see candidate profiles, validated skill levels and
            project links. They cannot see your chat messages with the counsellor.
          </p>
        </section>

        <section>
          <h2 className="section-title">What we don't do</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>We don't sell your data to anyone, and we don't run ads.</li>
            <li>We don't share your personal details with third-party marketers.</li>
            <li>We don't ask for payments — the platform is free for trainees.</li>
          </ul>
        </section>

        <section>
          <h2 className="section-title">Where data lives</h2>
          <p>
            Data is stored in a Supabase-managed PostgreSQL database and processed by the
            platform's own API service. As an early-stage project we follow standard security
            practice (encrypted transport, row-level access rules), but we can't yet make the
            certifications a mature company would.
          </p>
        </section>

        <section>
          <h2 className="section-title">Demo accounts</h2>
          <p>
            The demo accounts on the login page (e.g. demo.trainee@skillometrics.in) are seeded
            sample profiles, not real people. Anything you do in them stays in the demo dataset
            used for evaluation.
          </p>
        </section>

        <section>
          <h2 className="section-title">Your data, your call</h2>
          <p>
            Want your account or data removed? Reach the team through the project's GitHub
            repository (github.com/ajay010208/skillometrics) and we'll delete it.
          </p>
        </section>
      </GlassCard>
    </div>
  );
}
