import { ResumeEditor } from "@/components/resume/ResumeEditor";
import { sampleResume } from "@/data/sample-resume";

export default function Home() {
  return (
    <ResumeEditor initialResume={sampleResume} templateId="classic" />
  );
}
