import { ResumeEditor } from "@/components/resume/ResumeEditor";
import { sampleResume } from "@/data/sample-resume";

export default function Home() {
  const resumeSeedKey = `${sampleResume.summary}-${sampleResume.experience.length}-${sampleResume.education.length}`;

  return (
    <ResumeEditor
      key={resumeSeedKey}
      initialResume={sampleResume}
      templateId="classic"
    />
  );
}
