import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  FlaskConical,
  ChartNoAxesCombined,
  ArrowRight,
  Check,
  Link2,
} from "lucide-react";
import { Brand } from "@/components/brand";
export default function Home() {
  return (
    <div className="landing">
      <nav className="public-nav">
        <Brand />
        <div>
          <Link href="/login">Sign in</Link>
          <Link className="button primary" href="/signup">
            Get started <ArrowUpRight size={16} />
          </Link>
        </div>
      </nav>
      <main>
        <section className="hero">
          <div className="eyebrow">
            <span className="live-dot" /> THE INTELLIGENT LINK WORKSPACE
          </div>
          <h1>
            Small links.
            <br />
            Big possibilities.
            <br />
            <em>Zero guesswork.</em>
          </h1>
          <p>
            Turn every URL into a connection you can control.
            <br />
            Create, protect, and measure your links — with rules you can prove
            before you publish.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/signup">
              Create your first link <ArrowRight size={18} />
            </Link>
            <a href="#how" className="button secondary">
              See how it works
            </a>
          </div>
          <p className="hero-foot">
            <Check size={15} /> Real analytics <Check size={15} /> Built-in QR
            codes <Check size={15} /> One shared rule engine
          </p>
        </section>
        <section
          className="hero-console"
          aria-label="Illustration of the redirect evaluation flow"
        >
          <div className="console-top">
            <span className="live-dot" /> REDIRECT ENGINE{" "}
            <span className="muted">Illustrative evaluation</span>
          </div>
          <div className="console-url">
            <Link2 size={22} />
            <span>
              your-domain.com / <strong>launch</strong>
            </span>
            <span className="badge">RULE CHECK</span>
          </div>
          <div className="rule-flow">
            {[
              "Link is active",
              "Within expiry window",
              "Below visit limit",
              "Access authorized",
            ].map((r, i) => (
              <div key={r}>
                <span className="step">0{i + 1}</span>
                <span>{r}</span>
                <Check size={18} />
              </div>
            ))}
          </div>
          <div className="console-result">
            <span>Every rule. In the right order.</span>
            <strong>
              READY TO REDIRECT <ArrowUpRight size={18} />
            </strong>
          </div>
        </section>
        <section id="how" className="features">
          {[
            [
              Link2,
              "01 / CREATE",
              "A better way to share",
              "Custom aliases, campaigns and crisp QR codes. Give every connection a home.",
            ],
            [
              FlaskConical,
              "02 / PROVE",
              "Know before you go live",
              "Simulate expiry, click caps and passwords in Rule Lab. Understand every decision.",
            ],
            [
              ChartNoAxesCombined,
              "03 / UNDERSTAND",
              "See the real signal",
              "Track accepted visits and traffic sources. Keep probable bots visible and separate.",
            ],
          ].map(([Icon, k, t, d]) => (
            <article key={String(k)}>
              <div className="eyebrow">{String(k)}</div>
              {typeof Icon !== "string" && <Icon size={28} />}
              <h2>{String(t)}</h2>
              <p>{String(d)}</p>
            </article>
          ))}
        </section>
        <section className="landing-bottom">
          <ShieldCheck />
          <p>
            Short links you can trust. <strong>Rules you can prove.</strong>
          </p>
          <Link href="/signup">
            Start building <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <footer>
        LinkPulse · Thoughtfully connected.<span>Built for Innovista 2026</span>
      </footer>
    </div>
  );
}
