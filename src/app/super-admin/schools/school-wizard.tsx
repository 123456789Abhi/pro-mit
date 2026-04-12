"use client";

interface SchoolWizardProps {
  onSchoolCreated?: (schoolId: string) => void;
}

// Placeholder — full implementation TBD
export function SchoolWizard({ onSchoolCreated: _onSchoolCreated }: SchoolWizardProps) {
  return (
    <div className="py-12 text-center text-muted-foreground">
      School wizard coming soon
    </div>
  );
}
