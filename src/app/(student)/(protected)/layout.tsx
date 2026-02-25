import { StudentHeader } from '@/components/student/StudentHeader';
import { ReactNode } from "react";

const StudentProtectedLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(241,248,255,0.9),rgba(200,214,228,1)_45%)]">
      <div>
        <StudentHeader />
        {children}
      </div>
    </div>
  );
};

export default StudentProtectedLayout;
