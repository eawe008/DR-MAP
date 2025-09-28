// src/app/contact/page.jsx
import Image from "next/image";

const members = [
  {
    name: "Dylan Long",
    role: "Senior – Software Development",
    grad: "Graduation 2026",
    school: "Georgia Gwinnett College",
    linkedin: "https://www.linkedin.com/in/dylan-long-tech/",
    github: "https://github.com/dylanlongse",
  },
  {
    name: "Sam Keller",
    role: "Senior – Software Development",
    grad: "Graduation 2026",
    school: "Georgia Gwinnett College",
    linkedin: "https://www.linkedin.com/in/samuel-keller-5b97a51b4/",
    github: "https://github.com/KobenjiSan",
  },
  {
    name: "Ewura Ama Awere",
    role: "Senior – Software Development",
    grad: "Graduation 2026",
    school: "Georgia Gwinnett College",
    linkedin: "https://www.linkedin.com/in/ewura-ama-awere-758a21254/",
    github: "https://github.com/eawe008",
  },
  {
    name: "Shone Cherian",
    role: "Senior – Cyber Security",
    grad: "Graduation 2026",
    school: "Georgia Gwinnett College",
    linkedin: "https://www.linkedin.com/in/shonecherian/",
    github: "https://github.com/shoneshibucherian",
  },
];

export default function ContactPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Contact Us</h1>
        <p className="text-muted-foreground mb-12 text-center max-w-xl mx-auto">
          Meet our team of senior students at Georgia Gwinnett College,
          graduating in 2026. Connect with us on LinkedIn and GitHub!
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
          {members.map((m) => (
            <div
              key={m.name}
              className="rounded-xl border p-6 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-xl font-semibold">{m.name}</h2>
              <p className="text-sm text-muted-foreground">{m.role}</p>
              <p className="text-sm text-muted-foreground">{m.grad}</p>
              <p className="text-sm text-muted-foreground mb-3">{m.school}</p>

              {/* Social icons */}
              <div className="flex gap-4">
                <a href={m.linkedin} target="_blank" rel="noopener noreferrer">
                  <Image
                    src="/linkedin.svg"
                    alt="LinkedIn"
                    width={20}
                    height={20}
                    className="hover:opacity-80"
                  />
                </a>
                <a href={m.github} target="_blank" rel="noopener noreferrer">
                  <Image
                    src="/github.svg"
                    alt="GitHub"
                    width={20}
                    height={20}
                    className="hover:opacity-80"
                  />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
