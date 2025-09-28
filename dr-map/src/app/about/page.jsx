export default function AboutPage() {
  return (
    <div
      className="flex items-center justify-center px-6"
      style={{ minHeight: "calc(100vh - 64px)" }}
    >
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">About Medivyne</h1>
        <p className="text-muted-foreground mb-6">pls replace this</p>
        <p className="text-muted-foreground">
          Built with <span className="font-semibold">Next.js</span> and{" "}
          <span className="font-semibold">Flask</span>
        </p>
      </div>
    </div>
  );
}
