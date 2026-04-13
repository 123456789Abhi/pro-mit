"use client";

import NewSchoolPage from "@/app/super-admin/schools/new/page";

interface SchoolWizardProps {
  onSchoolCreated?: (schoolId: string) => void;
}

export function SchoolWizard({ onSchoolCreated: _onSchoolCreated }: SchoolWizardProps) {
  return <NewSchoolPage />;
}
