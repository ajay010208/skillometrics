import { GlassCard } from "../components/ui";

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: October 2026 · SkilloMetrics is an early-stage platform built for
          Smart India Hackathon 2025 (Problem 26135). Plain-language terms for a service that is
          still being developed.
        </p>
      </div>

      <GlassCard className="space-y-4 p-6 text-sm leading-relaxed text-slate-600">
        <section>
          <h2 className="section-title">The short version</h2>
          <p>
            SkilloMetrics is free to use, provided as-is while we build it. Use it honestly, don't
            break it, and don't use it to harm anyone. If something goes wrong, tell us and we'll
            do our best — but we can't promise the service will always be available or error-free.
          </p>
        </section>

        <section>
          <h2 className="section-title">Acceptable use</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Be yourself: don't impersonate other people or create fake candidate profiles.</li>
            <li>
              Don't upload content you don't have the right to share, and don't upload anything
              illegal, abusive, or unrelated to career building.
            </li>
            <li>
              Don't scrape, spam, probe, or attempt to break the platform, its API, or other
              users' accounts.
            </li>
            <li>
              Don't misrepresent your skills or placement data — the whole platform depends on
              verified outcomes being trustworthy.
            </li>
            <li>Recruiters: use candidate data only for genuine hiring on the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="section-title">AI features</h2>
          <p>
            The reality check, roadmap and counsellor use AI. AI output can be wrong or incomplete —
            treat it as guidance, not a guarantee. Career decisions stay yours; verify anything
            important (like salary claims or job details) before acting on it.
          </p>
        </section>

        <section>
          <h2 className="section-title">No warranty — early service</h2>
          <p>
            SkilloMetrics is provided "as is" and "as available" during early development. We may
            change, pause, or discontinue any feature (including demo accounts) at any time as we
            build toward a production service. To the maximum extent permitted by law, we make no
            warranties about availability, accuracy, or fitness for a particular purpose, and we
            are not liable for decisions made based on AI-generated guidance or for lost data or
            opportunities arising from service interruptions.
          </p>
        </section>

        <section>
          <h2 className="section-title">Accounts</h2>
          <p>
            You're responsible for activity under your account. Keep OAuth sign-in on your own
            accounts. We may suspend accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="section-title">Contact</h2>
          <p>
            Questions or problems? Reach the team through the project's GitHub repository
            (github.com/ajay010208/skillometrics).
          </p>
        </section>
      </GlassCard>
    </div>
  );
}
