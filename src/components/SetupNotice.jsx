export default function SetupNotice() {
  return (
    <div className="center-page light">
      <div className="card card-pad notice-box">
        <h1 className="page-title mb">Connect the database to finish setup</h1>
        <p>This site needs two settings so it can find your Supabase project:</p>
        <ol>
          <li><code>VITE_SUPABASE_URL</code> – your project URL</li>
          <li><code>VITE_SUPABASE_ANON_KEY</code> – your project’s anon (publishable) key</li>
        </ol>
        <p className="mb">
          Locally, put them in a file named <code>.env</code> (copy <code>.env.example</code>). On Netlify, add them under
          <em> Site configuration → Environment variables</em>, then redeploy. The README walks through it step by step.
        </p>
        <p className="muted">Nothing is wrong with the site itself – it is just waiting for these two values.</p>
      </div>
    </div>
  );
}
