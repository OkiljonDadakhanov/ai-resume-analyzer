import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { usePuterStore } from "lib/puter";

export const meta = () => [
  {
    title: "Resumechi | Auth",
    description: "This is the authentication page.",
    content: "Login or register to access your resume builder.",
  },
];

function Auth() {
  const { isLoading, auth } = usePuterStore();
  const location = useLocation();
  const next = location.search.split("next=")[1];
  const navigate = useNavigate();

  useEffect(() => { 
    if (auth.isAuthenticated) navigate(next);   
  }, [auth.isAuthenticated, next])


  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center">
      <div className="gradient-boder shadow-lg p-1 rounded-lg">
        <section className="flex flex-col gap-8 bg-white rounded-2xl p-10">
          <div className="flex flex-col gap-2 items-center text-center">
            <h1>Welcome</h1>
            <h2>Log in to countinue your job journey</h2>
          </div>
          <div>
            {isLoading ? (
              <button className="auth-button animate-pulse">
                <p>Signing in...</p>
              </button>
            ) : (
              <>
                {auth.isAuthenticated ? (
                  <button onClick={auth.signOut} className="auth-button">
                    <p>Log Out</p>
                  </button>
                ) : (
                  <button onClick={auth.signIn} className="auth-button">
                    <p>Log in</p>
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Auth;
