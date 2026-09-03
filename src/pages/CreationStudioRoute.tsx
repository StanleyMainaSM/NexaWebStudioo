import { useParams } from 'react-router-dom';
import WebsiteCreationStudio from './WebsiteCreationStudio';

export default function CreationStudioRoute() {
  const { creationProjectId } = useParams<{ creationProjectId: string }>();
  return <WebsiteCreationStudio creationProjectId={creationProjectId} />;
}
