import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { getCurrentUser } from "aws-amplify/auth";

// Mock Amplify
jest.mock("aws-amplify/auth", () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  confirmSignUp: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
  fetchAuthSession: jest.fn(),
  resendSignUpCode: jest.fn(),
  resetPassword: jest.fn(),
  confirmResetPassword: jest.fn(),
}));

jest.mock("./auth-config", () => ({
  configureAuth: jest.fn(),
}));

const TestComponent = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? "Authenticated" : "Unauthenticated"}</div>
      <div data-testid="user-id">{user?.userId}</div>
    </div>
  );
};

describe("AuthContext", () => {
  it("restores session on mount", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ userId: "test-user", username: "test-user" });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated");
      expect(screen.getByTestId("user-id")).toHaveTextContent("test-user");
    });
  });

  it("handles unauthenticated state", async () => {
    (getCurrentUser as jest.Mock).mockRejectedValue(new Error("No user"));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("Unauthenticated");
    });
  });
});
