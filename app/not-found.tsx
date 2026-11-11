import Link from 'next/link';

const NotFound = () => {
  return (
    <div className="container section">
      <h1>Page not found</h1>
      <p>The address may have changed.</p>
      <Link className="button" href="/">Back to the market</Link>
    </div>
  );
};

export default NotFound;
