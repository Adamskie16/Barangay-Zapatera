import React from 'react';
import MonthlyDemandReportImpl from './MonthlyDemandReport.jsx';

export interface MonthlyDemandReportProps {
  requests?: any[];
  docTypes?: any[];
  currentUser?: Record<string, any>;
  config?: Record<string, any>;
}

const MonthlyDemandReport: React.FC<MonthlyDemandReportProps> = (props) => {
  return <MonthlyDemandReportImpl {...props} />;
};

export default MonthlyDemandReport;
