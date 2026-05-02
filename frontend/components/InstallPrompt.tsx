"use client";

import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const { isInstallable, isIOS, triggerInstall, dismissPrompt } =
    useInstallPrompt();
  const [visible, setVisible] = useState(false);

  // Slight delay so it doesn't flash on first paint
  useEffect(() => {
    if (isInstallable) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isInstallable]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(dismissPrompt, 300); // wait for exit animation
  };

  const handleInstall = async () => {
    if (!isIOS) await triggerInstall();
  };

  if (!isInstallable) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

        .lumen-install-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(9, 11, 12, 0.5);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .lumen-install-backdrop.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .lumen-install-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          font-family: 'DM Sans', sans-serif;
          transform: translateY(100%);
          transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .lumen-install-sheet.visible {
          transform: translateY(0);
        }

        .lumen-install-inner {
          background: #0f1012;
          border-top: 1px solid rgba(130, 0, 219, 0.25);
          border-radius: 20px 20px 0 0;
          padding: 28px 24px 36px;
          position: relative;
          overflow: hidden;
        }

        /* Purple glow top edge */
        .lumen-install-inner::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 1px;
          background: linear-gradient(90deg, transparent, #8200db, transparent);
        }

        /* Ambient glow */
        .lumen-install-inner::after {
          content: '';
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 280px;
          height: 120px;
          background: radial-gradient(ellipse, rgba(130, 0, 219, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .lumen-install-handle {
          width: 36px;
          height: 4px;
          background: rgba(255,255,255,0.12);
          border-radius: 2px;
          margin: 0 auto 24px;
        }

        .lumen-install-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 12px;
        }

        .lumen-install-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #8200db, #5a0098);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 20px rgba(130, 0, 219, 0.4);
        }

        .lumen-install-icon svg {
          width: 26px;
          height: 26px;
          color: #fff;
        }

        .lumen-install-title {
          font-size: 18px;
          font-weight: 600;
          color: #f0edf6;
          letter-spacing: -0.3px;
          margin: 0 0 2px;
        }

        .lumen-install-subtitle {
          font-size: 12px;
          font-weight: 500;
          color: #8200db;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          margin: 0;
        }

        .lumen-install-description {
          font-size: 14px;
          color: rgba(240, 237, 246, 0.5);
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .lumen-install-features {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .lumen-install-feature {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(130, 0, 219, 0.1);
          border: 1px solid rgba(130, 0, 219, 0.2);
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 12px;
          color: rgba(240, 237, 246, 0.7);
          font-weight: 500;
        }

        .lumen-install-feature-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #8200db;
          flex-shrink: 0;
        }

        .lumen-install-actions {
          display: flex;
          gap: 10px;
        }

        .lumen-btn-install {
          flex: 1;
          padding: 14px;
          background: linear-gradient(135deg, #8200db, #6600af);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: -0.2px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(130, 0, 219, 0.35);
        }

        .lumen-btn-install::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0);
          transition: background 0.2s ease;
        }

        .lumen-btn-install:active::before {
          background: rgba(255,255,255,0.08);
        }

        .lumen-btn-dismiss {
          padding: 14px 18px;
          background: rgba(255,255,255,0.05);
          color: rgba(240, 237, 246, 0.4);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .lumen-btn-dismiss:active {
          background: rgba(255,255,255,0.08);
        }

        /* iOS instruction box */
        .lumen-ios-steps {
          background: rgba(130, 0, 219, 0.07);
          border: 1px solid rgba(130, 0, 219, 0.18);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 20px;
        }

        .lumen-ios-step {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: rgba(240, 237, 246, 0.6);
          line-height: 1.5;
        }

        .lumen-ios-step + .lumen-ios-step {
          margin-top: 10px;
        }

        .lumen-ios-step-num {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(130, 0, 219, 0.3);
          color: #c270ff;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className={`lumen-install-backdrop ${visible ? "visible" : ""}`}
        onClick={handleDismiss}
      />

      {/* Bottom sheet */}
      <div
        className={`lumen-install-sheet ${visible ? "visible" : ""}`}
        role="dialog"
        aria-label="Install Lumen"
      >
        <div className="lumen-install-inner">
          <div className="lumen-install-handle" />

          <div className="lumen-install-header">
            <div className="lumen-install-icon">
              {/* Lumen flame/light icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z" />
                <path d="M12 12c-1 1.5-1 3 0 4s2.5.5 3-1" />
              </svg>
            </div>
            <div>
              <p className="lumen-install-title">Lumen</p>
              <p className="lumen-install-subtitle">Safer Navigation</p>
            </div>
          </div>

          <p className="lumen-install-description">
            Add Lumen to your home screen for instant access to safer routes —
            even offline.
          </p>

          <div className="lumen-install-features">
            <span className="lumen-install-feature">
              <span className="lumen-install-feature-dot" />
              Works offline
            </span>
            <span className="lumen-install-feature">
              <span className="lumen-install-feature-dot" />
              Faster startup
            </span>
            <span className="lumen-install-feature">
              <span className="lumen-install-feature-dot" />
              No app store needed
            </span>
          </div>

          {isIOS && (
            <div className="lumen-ios-steps">
              <div className="lumen-ios-step">
                <span className="lumen-ios-step-num">1</span>
                <span>
                  Tap the{" "}
                  <strong style={{ color: "rgba(240,237,246,0.8)" }}>
                    Share
                  </strong>{" "}
                  button in Safari's toolbar
                </span>
              </div>
              <div className="lumen-ios-step">
                <span className="lumen-ios-step-num">2</span>
                <span>
                  Scroll down and tap{" "}
                  <strong style={{ color: "rgba(240,237,246,0.8)" }}>
                    Add to Home Screen
                  </strong>
                </span>
              </div>
              <div className="lumen-ios-step">
                <span className="lumen-ios-step-num">3</span>
                <span>
                  Tap{" "}
                  <strong style={{ color: "rgba(240,237,246,0.8)" }}>
                    Add
                  </strong>{" "}
                  to confirm
                </span>
              </div>
            </div>
          )}

          <div className="lumen-install-actions">
            {!isIOS && (
              <button className="lumen-btn-install" onClick={handleInstall}>
                Add to Home Screen
              </button>
            )}
            <button className="lumen-btn-dismiss" onClick={handleDismiss}>
              {isIOS ? "Got it" : "Not now"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
