import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/showcase")({
  head: () => ({
    meta: [
      { title: "JustAsk — Design Showcase" },
      {
        name: "description",
        content: "Alternate design showcase — two iOS device frames side by side.",
      },
      { property: "og:title", content: "JustAsk — Design Showcase" },
      {
        property: "og:description",
        content: "Alternate design direction comparison.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: Showcase,
});

const CSS = `
@font-face {
  font-family: 'ITC Garamond Std Narrow';
  font-weight: 300;
  font-style: normal;
  font-display: swap;
  src: url('https://res.cloudinary.com/dgupuutfn/raw/upload/v1783596334/ITCGaramondStd-LtNarrow_i2zcip.woff2') format('woff2'),
       url('https://res.cloudinary.com/dgupuutfn/raw/upload/v1783596334/ITCGaramondStd-LtNarrow_soc5vc.woff') format('woff');
}
@font-face {
  font-family: 'ITC Garamond Std Narrow';
  font-weight: 400 500;
  font-style: normal;
  font-display: swap;
  src: url('https://res.cloudinary.com/dgupuutfn/raw/upload/v1783596334/ITCGaramondStd-BkNarrow_xjfoc0.woff2') format('woff2'),
       url('https://res.cloudinary.com/dgupuutfn/raw/upload/v1783596334/ITCGaramondStd-BkNarrow_wfoxm1.woff') format('woff');
}
@font-face {
  font-family: 'ITC Garamond Std Narrow';
  font-weight: 400 500;
  font-style: italic;
  font-display: swap;
  src: url('https://res.cloudinary.com/dgupuutfn/raw/upload/v1783596334/ITCGaramondStd-BkNarrowIta_hiy9ld.woff2') format('woff2'),
       url('https://res.cloudinary.com/dgupuutfn/raw/upload/v1783596334/ITCGaramondStd-BkNarrowIta_rlarxo.woff') format('woff');
}

.ze-stage-page {
  margin: 0;
  min-height: 100vh;
  background: #F4F4F4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  box-sizing: border-box;
  overflow: hidden;
  direction: ltr;
}
.ze-stage {
  display: flex;
  gap: 70px;
  transform-origin: center center;
  transition: transform 0.2s ease-out;
}

/* iOS Device Frame */
.ze-phone {
  position: relative;
  width: 370px;
  height: 790px;
  border-radius: 48px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12);
  overflow: hidden;
  flex-shrink: 0;
}
.ze-phone.light { background: #F2F2F7; }
.ze-phone.dark  { background: #000; }

.ze-island {
  position: absolute;
  top: 11px;
  left: 50%;
  transform: translateX(-50%);
  width: 126px;
  height: 37px;
  border-radius: 24px;
  background: #000;
  z-index: 50;
}
.ze-statusbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  z-index: 45;
  color: #fff;
  pointer-events: none;
}
.ze-time {
  font-family: -apple-system, "SF Pro Text", "SF Pro", "Helvetica Neue", sans-serif;
  font-weight: 590;
  font-size: 17px;
  color: #fff;
  padding-top: 15px;
}
.ze-statusicons {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 15px;
}
.ze-home-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 139px;
  height: 5px;
  border-radius: 100px;
  z-index: 45;
}
.ze-phone.light .ze-home-indicator { background: rgba(0,0,0,0.25); }
.ze-phone.dark  .ze-home-indicator { background: rgba(255,255,255,0.7); }

/* Screen 1 */
.ze-screen1-bg { position: absolute; inset: 0; background: #02040c; overflow: hidden; }
.ze-screen1-inner {
  width: 470px; height: 1008px;
  transform: scale(0.787234);
  transform-origin: top left;
  position: relative;
}
.ze-hero-video {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center 48%;
  z-index: 0;
  opacity: 0;
}
.ze-ready .ze-hero-video {
  animation: zeBgSettle 1.7s cubic-bezier(0.16,1,0.3,1) 0s forwards;
}
.ze-hero-fade {
  position: absolute; left: 0; right: 0; bottom: 0;
  height: 46%;
  background: linear-gradient(to bottom,
    rgba(2,4,12,0) 0%,
    rgba(2,4,12,0.35) 46%,
    rgba(2,4,12,0.72) 100%);
  z-index: 1;
}
.ze-logo {
  position: absolute;
  top: 74px;
  left: 50%;
  transform: translateX(-50%);
  width: 118px;
  filter: drop-shadow(0 0 7px rgba(190,215,255,.28));
  z-index: 4;
  opacity: 0;
}
.ze-ready .ze-logo {
  animation: zeDrop 0.9s cubic-bezier(0.16,1,0.3,1) 0.45s forwards;
}
.ze-title {
  position: absolute;
  top: 618px;
  left: 0; right: 0;
  text-align: center;
  font-family: 'ITC Garamond Std Narrow', 'Playfair Display', Georgia, serif;
  font-weight: 300;
  font-size: 66px;
  line-height: 68px;
  letter-spacing: 0.2px;
  color: #fff;
  text-shadow: 0 0 34px rgba(255,255,255,.22), 0 1px 2px rgba(0,0,0,.35);
  z-index: 4;
  opacity: 0;
}
.ze-ready .ze-title {
  animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.62s forwards;
}
.ze-title i {
  font-style: italic;
  font-weight: 400;
  text-shadow: 0 0 34px rgba(255,255,255,.22), 0 1px 2px rgba(0,0,0,.35),
               0 0 10px rgba(255,255,255,.6), 0 0 20px rgba(255,235,190,.5),
               0 0 40px rgba(255,210,140,.32);
}
.ze-subtitle {
  position: absolute;
  top: 787px;
  left: 0; right: 0;
  text-align: center;
  font-family: 'Inter', sans-serif;
  font-size: 16.5px;
  font-weight: 400;
  line-height: 26px;
  color: rgba(255,255,255,.52);
  z-index: 4;
  white-space: pre-line;
  opacity: 0;
}
.ze-ready .ze-subtitle {
  animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.78s forwards;
}
.ze-cta-apple {
  position: absolute;
  top: 874px;
  left: 32px;
  width: 406px;
  height: 55px;
  background: #fff;
  border-radius: 28px;
  box-shadow: 0 6px 26px rgba(0,0,0,.28);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 4;
  border: none;
  cursor: pointer;
  font-family: "Helvetica Neue", -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: #1a1a1a;
  -webkit-text-stroke: 0.6px #1a1a1a;
  opacity: 0;
}
.ze-ready .ze-cta-apple {
  animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.94s forwards;
}
.ze-terms {
  position: absolute;
  top: 950px;
  left: 0; right: 0;
  text-align: center;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: rgba(255,255,255,.42);
  z-index: 4;
  opacity: 0;
}
.ze-terms b { color: rgba(255,255,255,.82); font-weight: 400; }
.ze-ready .ze-terms {
  animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 1.06s forwards;
}

/* Screen 2 */
.ze-screen2-bg { position: absolute; inset: 0; background: #14151d; overflow: hidden; }
.ze-pro-video {
  position: absolute;
  left: 0;
  top: -30%;
  width: 370px;
  height: 790px;
  object-fit: cover;
  z-index: 0;
  opacity: 0;
}
.ze-ready .ze-pro-video {
  animation: zeBgSettle 1.7s cubic-bezier(0.16,1,0.3,1) 0.12s forwards;
}
.ze-pro-fade {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom,
    rgba(20,21,29,0) 0%,
    rgba(20,21,29,0) 40%,
    rgba(20,21,29,0.55) 55%,
    rgba(20,21,29,0.92) 66%,
    #14151d 74%,
    #14151d 100%);
  z-index: 1;
}
.ze-pro-heading {
  position: absolute;
  left: 28px;
  top: 386px;
  font-family: 'ITC Garamond Std Narrow', 'Playfair Display', Georgia, serif;
  font-weight: 500;
  font-size: 26px;
  line-height: 1;
  color: #fff;
  letter-spacing: 0.2px;
  text-shadow: 0 0 18px rgba(120,180,220,0.35);
  z-index: 3;
  opacity: 0;
}
.ze-ready .ze-pro-heading {
  animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.58s forwards;
}
.ze-pro-divider {
  position: absolute;
  left: 28px;
  top: 418px;
  width: 265px;
  height: 1px;
  background: linear-gradient(to right,
    rgba(255,255,255,0.30) 0%,
    rgba(255,255,255,0.30) 70%,
    rgba(255,255,255,0) 100%);
  z-index: 3;
  transform: scaleX(0);
  transform-origin: left;
}
.ze-ready .ze-pro-divider {
  animation: zeLine 0.9s cubic-bezier(0.16,1,0.3,1) 0.72s forwards;
}
.ze-features {
  position: absolute;
  left: 28px;
  top: 429px;
  width: 314px;
  z-index: 3;
}
.ze-feat {
  display: flex;
  align-items: center;
  height: 24px;
  margin-bottom: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  font-weight: 400;
  color: #fff;
  opacity: 0;
}
.ze-feat-icon {
  width: 22px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.ze-feat-text { margin-left: 4px; }
.ze-ready .ze-feat-1 { animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.80s forwards; }
.ze-ready .ze-feat-2 { animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.88s forwards; }
.ze-ready .ze-feat-3 { animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.96s forwards; }
.ze-ready .ze-feat-4 { animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 1.04s forwards; }
.ze-ready .ze-feat-5 { animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 1.12s forwards; }

.ze-cards {
  position: absolute;
  left: 28px;
  top: 561px;
  width: 314px;
  height: 123px;
  z-index: 3;
}
.ze-card {
  position: absolute;
  top: 0;
  height: 123px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.11);
  overflow: hidden;
  opacity: 0;
}
.ze-card-monthly {
  left: 0;
  width: 144px;
  background-image: url('https://polo-pecan-73837341.figma.site/_assets/v11/ef4533e6536f2495088e56e0f98036b5ff15446d.png');
  background-size: cover;
  background-position: center;
}
.ze-card-yearly {
  left: 154px;
  width: 160px;
  background: #1e212a;
}
.ze-ready .ze-card-monthly { animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 1.22s forwards; }
.ze-ready .ze-card-yearly  { animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 1.30s forwards; }

.ze-card-inner {
  padding: 14px 14px 15px 15px;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: 'Inter', sans-serif;
  color: #fff;
}
.ze-card-monthly .ze-card-inner > * { text-shadow: 0 1px 6px rgba(0,0,0,0.35); }
.ze-card-label { font-size: 13px; font-weight: 400; }
.ze-card-price { font-size: 19px; font-weight: 500; margin-top: 6px; letter-spacing: 0.3px; }
.ze-card-billed { font-size: 12px; font-weight: 400; }
.ze-card-yearly .ze-card-label,
.ze-card-yearly .ze-card-billed { color: rgba(255,255,255,0.50); }
.ze-card-yearly .ze-card-price { color: rgba(255,255,255,0.62); }

.ze-save {
  position: absolute;
  left: 15px;
  top: 66px;
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: 11px;
  background: #4d5057;
  font-size: 10.5px;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  letter-spacing: 0.2px;
  z-index: 4;
  opacity: 0;
  transform: translateY(8px) scale(0.78);
}
.ze-ready .ze-save {
  animation: zePop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 1.55s forwards;
}

.ze-subscribe {
  position: absolute;
  left: 28px;
  top: 709px;
  width: 314px;
  height: 50px;
  background: #fff;
  border-radius: 26px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #0c0c0e;
  font-family: "Helvetica Neue", -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  -webkit-text-stroke: 0.4px;
  z-index: 3;
  opacity: 0;
}
.ze-ready .ze-subscribe {
  animation: zeReveal 0.9s cubic-bezier(0.16,1,0.3,1) 1.42s forwards;
}

@keyframes zeBgSettle {
  from { transform: scale(1.12); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
@keyframes zeReveal {
  from { transform: translateY(26px) scale(0.985); filter: blur(7px); opacity: 0; }
  to   { transform: translateY(0)    scale(1);     filter: blur(0);   opacity: 1; }
}
@keyframes zeDrop {
  from { transform: translateX(-50%) translateY(-16px) scale(0.90); opacity: 0; }
  to   { transform: translateX(-50%) translateY(0)     scale(1);    opacity: 1; }
}
@keyframes zeLine {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@keyframes zePop {
  0%   { transform: translateY(8px) scale(0.78); opacity: 0; }
  70%  { transform: translateY(0)   scale(1.07); opacity: 1; }
  100% { transform: translateY(0)   scale(1);    opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .ze-ready *,
  .ze-hero-video, .ze-pro-video,
  .ze-logo, .ze-title, .ze-subtitle, .ze-cta-apple, .ze-terms,
  .ze-pro-heading, .ze-pro-divider, .ze-feat, .ze-card, .ze-save, .ze-subscribe {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }
  .ze-logo { transform: translateX(-50%) !important; }
  .ze-save { transform: none !important; }
}
`;

function StatusIcons() {
  return (
    <div className="ze-statusicons">
      {/* Signal */}
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
        <rect x="0" y="8" width="3" height="4" rx="0.5" fill="#fff" />
        <rect x="5" y="5" width="3" height="7" rx="0.5" fill="#fff" />
        <rect x="10" y="2" width="3" height="10" rx="0.5" fill="#fff" />
        <rect x="15" y="0" width="3" height="12" rx="0.5" fill="#fff" />
      </svg>
      {/* WiFi */}
      <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
        <path
          d="M8.5 2C11.5 2 14.2 3.1 16.3 4.9"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8.5 5C10.5 5 12.3 5.8 13.8 7.1"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8.5 8C9.4 8 10.2 8.3 10.9 8.9"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="8.5" cy="10.5" r="1" fill="#fff" />
      </svg>
      {/* Battery */}
      <svg width="27" height="12" viewBox="0 0 27 12" fill="none">
        <rect
          x="0.5"
          y="0.5"
          width="23"
          height="11"
          rx="3"
          stroke="#fff"
          strokeOpacity="0.4"
          fill="none"
        />
        <rect x="2" y="2" width="20" height="8" rx="1.5" fill="#fff" />
        <rect x="24.5" y="4" width="1.5" height="4" rx="0.75" fill="#fff" />
      </svg>
    </div>
  );
}

function PhoneChrome({ variant }: { variant: "light" | "dark" }) {
  return (
    <>
      <div className="ze-statusbar">
        <div className="ze-time">11:11</div>
        <StatusIcons />
      </div>
      <div className="ze-island" />
      <div className="ze-home-indicator" />
      {variant === "light" ? null : null}
    </>
  );
}

function Showcase() {
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const proVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Auto scale
    function fit() {
      const stage = stageRef.current;
      const vp = viewportRef.current;
      if (!stage || !vp) return;
      const stageW = 370 * 2 + 70;
      const stageH = 790;
      const availW = window.innerWidth - 80;
      const availH = window.innerHeight - 80;
      const ratio = Math.min(availW / stageW, availH / stageH, 1);
      stage.style.transform = `scale(${ratio * 0.95})`;
    }
    fit();
    window.addEventListener("resize", fit);

    // Gate animations
    const vp = viewportRef.current;
    let loaded = 0;
    let done = false;
    const ready = () => {
      if (done || !vp) return;
      done = true;
      vp.classList.add("ze-ready");
    };
    const onLoad = () => {
      loaded += 1;
      if (loaded >= 2) {
        if ((document as any).fonts?.ready) {
          (document as any).fonts.ready.then(ready);
        } else {
          ready();
        }
      }
    };
    heroVideoRef.current?.addEventListener("loadeddata", onLoad);
    proVideoRef.current?.addEventListener("loadeddata", onLoad);
    const t = window.setTimeout(ready, 5000);

    return () => {
      window.removeEventListener("resize", fit);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="ze-stage-page" ref={viewportRef}>
        <div className="ze-stage" ref={stageRef}>
          {/* Screen 1 — Light frame */}
          <div className="ze-phone light">
            <div className="ze-screen1-bg">
              <div className="ze-screen1-inner">
                <video
                  ref={heroVideoRef}
                  className="ze-hero-video"
                  src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260710_114906_ad7cee37-9e56-434f-99bc-92d5bdc4f9fe.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="ze-hero-fade" />
                <img
                  className="ze-logo"
                  src="https://polo-pecan-73837341.figma.site/_assets/v11/b1ddc82509144261f1999a0c4d92be5ce6689c0f.png"
                  alt=""
                />
                <div className="ze-title">
                  The place for all
                  <br />
                  <i>your places</i>
                </div>
                <div className="ze-subtitle">
                  {"Save, Organize and Share\nyour favorite places"}
                </div>
                <button className="ze-cta-apple" type="button">
                  <svg width="18" height="21" viewBox="0 0 18 21" fill="#1a1a1a">
                    <path d="M14.94 10.9c-.02-2.42 1.98-3.58 2.07-3.64-1.13-1.65-2.89-1.88-3.51-1.9-1.5-.15-2.92.88-3.68.88-.77 0-1.94-.86-3.19-.83-1.64.02-3.15.95-4 2.42-1.7 2.95-.44 7.32 1.22 9.72.82 1.17 1.79 2.48 3.05 2.44 1.22-.05 1.68-.79 3.16-.79 1.47 0 1.89.79 3.19.76 1.32-.02 2.15-1.19 2.95-2.36.93-1.36 1.32-2.68 1.34-2.75-.03-.01-2.58-.99-2.6-3.95zM12.53 3.6c.68-.82 1.14-1.96.99-3.1-.98.04-2.17.65-2.87 1.47-.63.73-1.18 1.9-1.03 3.02 1.09.08 2.22-.55 2.91-1.39z" />
                  </svg>
                  Continue with Apple
                </button>
                <div className="ze-terms">
                  By continuing, you agree to <b>Terms of Use</b>
                </div>
              </div>
            </div>
            <PhoneChrome variant="light" />
          </div>

          {/* Screen 2 — Dark frame */}
          <div className="ze-phone dark">
            <div className="ze-screen2-bg">
              <video
                ref={proVideoRef}
                className="ze-pro-video"
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260710_115050_a1ba47d0-aedf-413c-9dea-14509599d3dd.mp4"
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="ze-pro-fade" />
              <div className="ze-pro-heading">Unlock Pro:</div>
              <div className="ze-pro-divider" />
              <div className="ze-features">
                <div className="ze-feat ze-feat-1">
                  <span className="ze-feat-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                      <path d="M2 12l10 5 10-5" />
                      <path d="M2 17l10 5 10-5" />
                    </svg>
                  </span>
                  <span className="ze-feat-text">Create private Guides</span>
                </div>
                <div className="ze-feat ze-feat-2">
                  <span className="ze-feat-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
                      <line x1="10.5" y1="18.5" x2="13.5" y2="18.5" />
                    </svg>
                  </span>
                  <span className="ze-feat-text">Import from social media</span>
                </div>
                <div className="ze-feat ze-feat-3">
                  <span className="ze-feat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.988-8-13.083-8-5.096 0-5.096 8 0 8 5.095 0 7.988-8 13.083-8z" />
                    </svg>
                  </span>
                  <span className="ze-feat-text">Unlimited Guides</span>
                </div>
                <div className="ze-feat ze-feat-4">
                  <span className="ze-feat-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3c.4 3.6 1.4 4.6 5 5-3.6.4-4.6 1.4-5 5-.4-3.6-1.4-4.6-5-5 3.6-.4 4.6-1.4 5-5Z" />
                    </svg>
                  </span>
                  <span className="ze-feat-text">AI search</span>
                </div>
                <div className="ze-feat ze-feat-5">
                  <span className="ze-feat-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8.5" cy="8" r="3" />
                      <path d="M2 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
                      <circle cx="16" cy="9" r="2.5" />
                      <path d="M14 14c3 0 6 2 6 5" />
                    </svg>
                  </span>
                  <span className="ze-feat-text">Collaborate with friends</span>
                </div>
              </div>

              <div className="ze-cards">
                <div className="ze-card ze-card-monthly">
                  <div className="ze-card-inner">
                    <div>
                      <div className="ze-card-label">Monthly</div>
                      <div className="ze-card-price">$20</div>
                    </div>
                    <div className="ze-card-billed">Billed Monthly</div>
                  </div>
                </div>
                <div className="ze-card ze-card-yearly">
                  <div className="ze-card-inner">
                    <div>
                      <div className="ze-card-label">Yearly</div>
                      <div className="ze-card-price">$200</div>
                    </div>
                    <div className="ze-card-billed">Billed Yearly</div>
                  </div>
                  <div className="ze-save">Save $40.00</div>
                </div>
              </div>

              <button className="ze-subscribe" type="button">
                Subscribe
                <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
                  <path d="M1.5 1.5 7 7.5 1.5 13.5" stroke="#0c0c0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <PhoneChrome variant="dark" />
          </div>
        </div>
      </div>
    </>
  );
}
