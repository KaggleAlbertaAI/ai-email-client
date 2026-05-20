import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock next-pwa
vi.mock("next-pwa", () => ({
  default: () => (config: unknown) => config,
}));
