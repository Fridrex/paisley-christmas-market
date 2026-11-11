'use client';

const ErrorPage = ({ reset }: { reset: () => void }) => {
  return (
    <div className="container section">
      <h1>We couldn’t load this page</h1>
      <p>Try again in a moment.</p>
      <button className="button" onClick={reset}>Try again</button>
    </div>
  );
};

export default ErrorPage;
