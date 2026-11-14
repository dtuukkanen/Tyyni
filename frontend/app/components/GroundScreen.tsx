"use client";

import type { PracticeModalState } from "../data/sanctuaryData";
import { Icon } from "./icons";
import type { SoundPreset } from "./soundEngine";

type GroundScreenProps = {
  activeSound: SoundPreset | null;
  onSoundToggle: (preset: SoundPreset, label: string) => void;
  onOpenModal: (modal: PracticeModalState) => void;
};

export function GroundScreen({
  activeSound,
  onSoundToggle,
  onOpenModal,
}: GroundScreenProps) {
  return (
    <main className="screen-body">
      <div className="hero-header">
        <span className="eyebrow-badge">
          <Icon name="spa" size={14} />
          <span>SOMATIC ANCHOR</span>
        </span>
        <h1 className="hero-title">Ground yourself.</h1>
        <p className="hero-subtitle">
          Choose one gentle practice. No rush, no expectations.
        </p>

        <div className="reassure-banner">
          <span className="icon-orb icon-orb-round tone-eucalyptus">
            <Icon name="twilight" size={20} />
          </span>
          <div className="reassure-copy">
            <strong>Your pace is worthy</strong>
            <span>
              Even closing your eyes for 30 seconds rewires the nervous system.
            </span>
          </div>
        </div>
      </div>

      <section className="practices-stack" aria-label="Grounding practices">
        {/* 1. Box Breathing */}
        <article className="practice-card">
          <div className="practice-top">
            <div className="practice-lead">
              <span className="icon-orb tone-moss">
                <Icon name="air" size={22} />
              </span>
              <div>
                <h2 className="practice-title">Box Breathing</h2>
                <p className="practice-desc">
                  Calm nervous system · Inhale, hold, exhale, rest
                </p>
              </div>
            </div>
            <span className="duration-pill">2 mins</span>
          </div>
          <div className="practice-footer">
            <span className="practice-note">
              <Icon name="infinity" size={16} />
              <span>Biomorphic balance</span>
            </span>
            <button
              type="button"
              className="btn-primary-pill"
              onClick={() =>
                onOpenModal({
                  mode: "breath",
                  category: "Breath Rhythm",
                  title: "Box Breathing",
                  description:
                    "Follow the soothing expansion. There is no right or wrong rhythm.",
                  icon: "air",
                })
              }
            >
              Begin
            </button>
          </div>
        </article>

        {/* 2. Sound Sanctuary */}
        <article className="practice-card">
          <div className="practice-top">
            <div className="practice-lead">
              <span className="icon-orb tone-linen">
                <Icon name="waves" size={22} />
              </span>
              <div>
                <h2 className="practice-title">Sound Sanctuary</h2>
                <p className="practice-desc">
                  Ambient rainfall, forest stream, singing bowl
                </p>
              </div>
            </div>
            <span className="duration-pill">5 mins</span>
          </div>
          <div className="practice-footer">
            <span className="practice-note">
              <span
                className={`wave-bars ${
                  activeSound === "sanctuary" ? "is-playing" : ""
                }`}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
              <span>Warm acoustic hum</span>
            </span>
            <button
              type="button"
              className={`btn-secondary-pill ${
                activeSound === "sanctuary" ? "is-active" : ""
              }`}
              onClick={() => onSoundToggle("sanctuary", "Sound Sanctuary")}
            >
              <Icon
                name={activeSound === "sanctuary" ? "pause" : "play"}
                size={15}
              />
              <span>{activeSound === "sanctuary" ? "Playing" : "Listen"}</span>
            </button>
          </div>
        </article>

        {/* 3. Nearby Nature */}
        <article className="practice-card">
          <div className="practice-top">
            <div className="practice-lead">
              <span className="icon-orb tone-moss">
                <Icon name="forest" size={22} />
              </span>
              <div>
                <h2 className="practice-title">Nearby nature</h2>
                <p className="practice-desc">
                  Quiet shaded trees, lake shores, riverbank, or open grass
                </p>
              </div>
            </div>
            <span className="duration-pill is-moss">0.8 km</span>
          </div>

          <div className="nature-map-card">
            <svg
              className="nature-map-svg"
              viewBox="0 0 360 110"
              preserveAspectRatio="xMidYMid slice"
              role="img"
              aria-label="Illustration of Linden Grove and Lakeside Haven path"
            >
              <rect width="360" height="110" fill="#d9eee2" />
              <path
                d="M0 78 C68 58, 125 90, 198 68 C260 49, 312 65, 360 48 L360 110 L0 110 Z"
                fill="#b8dec9"
              />
              <path
                d="M210 0 C235 34, 275 46, 360 40 L360 0 Z"
                fill="#bce0ea"
              />
              <path
                d="M24 96 Q 112 46, 198 62 T 334 26"
                fill="none"
                stroke="#fbf9f6"
                strokeWidth="3.5"
                strokeDasharray="6 5"
                strokeLinecap="round"
              />
              <circle cx="76" cy="42" r="14" fill="#9ccfB0" />
              <circle cx="96" cy="36" r="11" fill="#88c29f" />
              <circle cx="156" cy="32" r="15" fill="#9ccfB0" />
              <circle cx="198" cy="62" r="7" fill="#3a6057" />
              <circle
                cx="198"
                cy="62"
                r="13"
                fill="#3a6057"
                fillOpacity="0.22"
              />
            </svg>
            <div className="nature-map-caption">
              <Icon name="pin" size={15} />
              <span>Linden Grove &amp; Lakeside Haven (8 min gentle walk)</span>
            </div>
          </div>

          <div className="practice-footer">
            <span className="practice-note">
              Open benches · Low foot traffic · Calming water
            </span>
            <button
              type="button"
              className="btn-secondary-pill"
              onClick={() =>
                onOpenModal({
                  mode: "breath",
                  category: "Nature Connection",
                  title: "Linden Grove Sanctuary",
                  description:
                    "Step outside whenever you feel ready. Watching leaves move in the wind naturally softens cortisol.",
                  icon: "forest",
                  tips: [
                    "8 min level walk along shaded gravel",
                    "Quiet lakeside benches facing west",
                  ],
                })
              }
            >
              Explore
            </button>
          </div>
        </article>

        {/* 4. Gentle Body Scan */}
        <article className="practice-card">
          <div className="practice-top">
            <div className="practice-lead">
              <span className="icon-orb tone-eucalyptus">
                <Icon name="meditate" size={22} />
              </span>
              <div>
                <h2 className="practice-title">Gentle Body Scan</h2>
                <p className="practice-desc">
                  Unclench jaw, soften shoulders, release hands
                </p>
              </div>
            </div>
            <span className="duration-pill">3 mins</span>
          </div>
          <div className="practice-footer">
            <span className="practice-note">
              <span className="status-dot" aria-hidden="true" />
              <span>Seated or lying down</span>
            </span>
            <button
              type="button"
              className="btn-primary-pill"
              onClick={() =>
                onOpenModal({
                  mode: "breath",
                  category: "Quiet Unwinding",
                  title: "Gentle Body Softening",
                  description:
                    "Let your tongue rest away from the roof of your mouth. Drop your shoulders down an inch.",
                  icon: "meditate",
                })
              }
            >
              Begin
            </button>
          </div>
        </article>

        {/* 5. Gentle Mat Stretch */}
        <article className="practice-card">
          <div className="practice-top">
            <div className="practice-lead">
              <span className="icon-orb tone-blush">
                <Icon name="bed" size={22} />
              </span>
              <div>
                <h2 className="practice-title">Gentle Mat Stretch</h2>
                <p className="practice-desc">
                  Bed or soft rug · Child’s pose &amp; resting twist
                </p>
              </div>
            </div>
            <span className="duration-pill">5 mins</span>
          </div>
          <div className="practice-footer">
            <span className="practice-note">
              Zero sweat · Heavy pillows encouraged
            </span>
            <button
              type="button"
              className="btn-secondary-pill"
              onClick={() =>
                onOpenModal({
                  mode: "breath",
                  category: "Comfort First",
                  title: "Restorative Mat Rest",
                  description:
                    "Fold over a pillow in wide-knee child’s pose, then rest on your side with knees supported.",
                  icon: "bed",
                })
              }
            >
              View Poses
            </button>
          </div>
        </article>

        {/* 6. Mindful Slow Walk */}
        <article className="practice-card">
          <div className="practice-top">
            <div className="practice-lead">
              <span className="icon-orb tone-moss">
                <Icon name="walk" size={22} />
              </span>
              <div>
                <h2 className="practice-title">Mindful Slow Walk</h2>
                <p className="practice-desc">
                  Just feeling your feet contact the floor
                </p>
              </div>
            </div>
            <span className="duration-pill">10 mins</span>
          </div>
          <div className="practice-footer">
            <span className="practice-note">
              Indoor socks or outdoor stroll
            </span>
            <button
              type="button"
              className="btn-secondary-pill"
              onClick={() =>
                onOpenModal({
                  mode: "breath",
                  category: "Tactile Presence",
                  title: "Slow Grounding Walk",
                  description:
                    "Notice the heel touch, the roll across the sole, and the lift. There is nowhere to hurry.",
                  icon: "walk",
                })
              }
            >
              Begin
            </button>
          </div>
        </article>
      </section>

      <div className="section-block">
        <div className="reassure-footnote">
          <Icon name="verified" size={20} />
          <span>
            Doing even <strong>30 seconds</strong> counts as a full practice.
            Showing up for your breath is already enough.
          </span>
        </div>

        <button
          type="button"
          className="sos-pill-btn"
          onClick={() =>
            onOpenModal({
              mode: "breath",
              category: "Emergency Calm",
              title: "Deep Calming Sigh",
              description:
                "Take two soft sips of air in through your nose, followed by a long, unhurried sigh out your mouth.",
              icon: "heartFilled",
            })
          }
        >
          <Icon name="sos" size={20} />
          <span>Need immediate calm? 1-Tap SOS Breathing</span>
        </button>
      </div>
    </main>
  );
}
