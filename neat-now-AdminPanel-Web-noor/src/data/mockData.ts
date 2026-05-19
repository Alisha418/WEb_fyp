import { Report, Worker, ReportStatus, WasteType } from '../types';

// Mock Data Generator
export const generateMockReports = (): Report[] => {
  const citizens = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Tom Brown', 'Emily Davis', 'Chris Wilson', 'Anna Martinez'];
  const workers = ['Alex Chen', 'Maria Garcia', 'David Lee', 'Sophie Turner', 'James Anderson'];
  const zones = ['North District', 'South District', 'East District', 'West District', 'Central'];
  const locations = ['Main Street', 'Park Avenue', 'River Road', 'Hill View', 'Downtown Plaza', 'Market Square'];
  const statuses: ReportStatus[] = ['Pending', 'Assigned', 'Resolved', 'Overdue'];
  const wasteTypes: WasteType[] = ['Organic', 'Recyclable', 'Hazardous', 'General'];
  
  const reports: Report[] = [];
  
  for (let i = 0; i < 45; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const submittedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
    
    reports.push({
      id: `RPT-${String(i + 1001).padStart(6, '0')}`,
      citizenName: citizens[Math.floor(Math.random() * citizens.length)],
      citizenId: `CTZ-${Math.floor(Math.random() * 10000)}`,
      workerName: status !== 'Pending' ? workers[Math.floor(Math.random() * workers.length)] : undefined,
      workerId: status !== 'Pending' ? `WKR-${Math.floor(Math.random() * 1000)}` : undefined,
      location: `${locations[Math.floor(Math.random() * locations.length)]}, ${zones[Math.floor(Math.random() * zones.length)]}`,
      zone: zones[Math.floor(Math.random() * zones.length)],
      status,
      submittedAt,
      assignedAt: status !== 'Pending' ? new Date(submittedAt.getTime() + Math.random() * 2 * 60 * 60 * 1000) : undefined,
      resolvedAt: status === 'Resolved' ? new Date(submittedAt.getTime() + Math.random() * 24 * 60 * 60 * 1000) : undefined,
      wasteType,
      aiVerification: {
        verified: Math.random() > 0.2,
        confidence: 75 + Math.random() * 24,
        classification: wasteType
      },
      description: 'Illegal dumping of waste materials requiring immediate cleanup and removal.',
      beforeImage: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400',
      afterImage: status === 'Resolved' ? 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb6?w=400' : undefined,
      aiVerifiedImage: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400',
      urgency: Math.floor(Math.random() * 10) + 1,
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1
    });
  }
  
  return reports.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
};

export const generateMockWorkers = (): Worker[] => {
  const workers = [
    { name: 'Alex Chen', email: 'alex.chen@cleanup.gov', phone: '+1 555-0101', zone: 'North District' },
    { name: 'Maria Garcia', email: 'maria.garcia@cleanup.gov', phone: '+1 555-0102', zone: 'South District' },
    { name: 'David Lee', email: 'david.lee@cleanup.gov', phone: '+1 555-0103', zone: 'East District' },
    { name: 'Sophie Turner', email: 'sophie.turner@cleanup.gov', phone: '+1 555-0104', zone: 'West District' },
    { name: 'James Anderson', email: 'james.anderson@cleanup.gov', phone: '+1 555-0105', zone: 'Central' },
    { name: 'Lisa Wong', email: 'lisa.wong@cleanup.gov', phone: '+1 555-0106', zone: 'North District' },
    { name: 'Robert Kim', email: 'robert.kim@cleanup.gov', phone: '+1 555-0107', zone: 'South District' },
  ];
  
  return workers.map((w, i) => ({
    id: `WKR-${String(i + 1).padStart(4, '0')}`,
    ...w,
    tasksCompleted: Math.floor(Math.random() * 100) + 20,
    avgCompletionTime: Math.floor(Math.random() * 8) + 4,
    rating: 3.5 + Math.random() * 1.5,
    active: Math.random() > 0.2
  }));
};
