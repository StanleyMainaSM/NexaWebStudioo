#!/bin/bash
sed -i 's/useState<Record<string, unknown>\[\]>(\[\])/useState<any\[\]>(\[\])/g' src/pages/portal/Projects.tsx
sed -i 's/useState<Record<string, unknown> | null>(null)/useState<any>(null)/g' src/pages/portal/ProjectDetails.tsx
sed -i 's/useState<Record<string, unknown>\[\]>(\[\])/useState<any\[\]>(\[\])/g' src/pages/portal/ProjectDetails.tsx

# Create a types file
cat << 'TYPES' > src/types/database.ts
export type Project = {
  id: string;
  client_id: string | null;
  developer_id: string | null;
  connector_id: string | null;
  title: string;
  description: string | null;
  status: string;
  price: number | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  project_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  sender?: { email: string };
};
TYPES

mkdir -p src/types

# Fix Projects.tsx
sed -i '1s/^/import { Project } from "..\/..\/types\/database";\n/' src/pages/portal/Projects.tsx
sed -i 's/useState<any\[\]>(\[\])/useState<Project\[\]>(\[\])/g' src/pages/portal/Projects.tsx

# Fix ProjectDetails.tsx
sed -i '1s/^/import { Project, Message } from "..\/..\/types\/database";\n/' src/pages/portal/ProjectDetails.tsx
sed -i 's/useState<any>(null)/useState<Project | null>(null)/g' src/pages/portal/ProjectDetails.tsx
sed -i 's/useState<any\[\]>(\[\])/useState<Message\[\]>(\[\])/g' src/pages/portal/ProjectDetails.tsx

