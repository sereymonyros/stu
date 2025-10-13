
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface JobResultCardProps {
  job: {
    id: string;
    title: string;
    companyName: string;
    location: string;
    jobType: string;
  };
  onLinkClick?: () => void;
}

export function JobResultCard({ job, onLinkClick }: JobResultCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">{job.title}</CardTitle>
        <CardDescription>{job.companyName} - {job.location}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 flex justify-between items-center">
        <Badge variant="secondary">{job.jobType}</Badge>
        <Button asChild size="sm" variant="outline" onClick={onLinkClick}>
          <Link href={`/jobs/${job.id}/apply`}>View & Apply</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
