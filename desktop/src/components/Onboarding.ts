/**
 * Tabula Desktop - Onboarding Component
 * Shows a welcome wizard for first-time users
 */

export interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "Welcome to Tabula",
    description:
      "Your AI-powered second brain for browser tabs. Let's get you set up in just a few steps.",
    icon: "wave",
  },
  {
    title: "Connect the Extension",
    description:
      "Install the Tabula Chrome extension to sync your tabs. The extension captures screenshots and metadata automatically.",
    icon: "extension",
  },
  {
    title: "AI-Powered Analysis",
    description:
      "Add your OpenAI API key in Settings to enable intelligent tab suggestions. Or use our rule-based analysis for free!",
    icon: "ai",
  },
  {
    title: "Tell Us About You",
    description:
      "Share your work context in Settings to help AI understand which tabs matter to you. It learns from your decisions over time!",
    icon: "user",
  },
  {
    title: "You're All Set!",
    description:
      "Start browsing, and Tabula will help you keep your tabs organized. Use the Refresh button to capture screenshots.",
    icon: "check",
  },
];

function getStepIcon(iconName: string): string {
  switch (iconName) {
    case "wave":
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M7 10v4M11 7v10M15 4v16M19 7v10"/>
      </svg>`;
    case "extension":
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>`;
    case "ai":
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 2a10 10 0 1 0 10 10"/>
        <path d="M12 12l4-4"/>
        <circle cx="12" cy="12" r="2"/>
        <path d="M16 8h6M19 5v6"/>
      </svg>`;
    case "user":
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="7" r="4"/>
        <path d="M5.5 21a8.5 8.5 0 0 1 13 0"/>
      </svg>`;
    case "check":
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>`;
    default:
      return "";
  }
}

export function renderOnboardingModal(currentStep: number): string {
  const step = ONBOARDING_STEPS[currentStep];
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirst = currentStep === 0;

  return `
    <div class="onboarding-overlay" id="onboardingOverlay">
      <div class="onboarding-modal">
        <div class="onboarding-progress">
          ${ONBOARDING_STEPS.map(
            (_, i) =>
              `<div class="progress-dot ${i === currentStep ? "active" : ""} ${i < currentStep ? "completed" : ""}"></div>`
          ).join("")}
        </div>

        <div class="onboarding-content">
          <div class="onboarding-icon">
            ${getStepIcon(step.icon)}
          </div>
          <h2 class="onboarding-title">${step.title}</h2>
          <p class="onboarding-description">${step.description}</p>
        </div>

        <div class="onboarding-actions">
          ${
            !isFirst
              ? `<button class="btn secondary" id="onboardingPrevBtn">Back</button>`
              : `<button class="btn secondary" id="onboardingSkipBtn">Skip</button>`
          }
          ${
            isLast
              ? `<button class="btn primary" id="onboardingFinishBtn">Get Started</button>`
              : `<button class="btn primary" id="onboardingNextBtn">Next</button>`
          }
        </div>
      </div>
    </div>
  `;
}

export function shouldShowOnboarding(): boolean {
  return localStorage.getItem("tabula-onboarding-completed") !== "true";
}

export function markOnboardingComplete(): void {
  localStorage.setItem("tabula-onboarding-completed", "true");
}

export function resetOnboarding(): void {
  localStorage.removeItem("tabula-onboarding-completed");
}
