'use strict';

function jobAlertTemplate({ userName, matchedJobs }) {
  const primaryColor = '#4F46E5';
  const backgroundColor = '#F3F4F6';
  const cardColor = '#ffffff';
  const textColor = '#1F2937';
  const lightTextColor = '#6B7280';
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:9002';

  const formatCurrency = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }

  const generateJobList = () => {
    return matchedJobs.map(job => {
        const jobUrl = `${appBaseUrl}/jobs/${job.id}/apply`;
        let salaryDisplay = '';
        if (job.salaryMin && job.salaryMax) {
            salaryDisplay = `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax)}`;
        } else if (job.salaryMin) {
            salaryDisplay = `From ${formatCurrency(job.salaryMin)}`;
        } else if (job.salaryMax) {
            salaryDisplay = `Up to ${formatCurrency(job.salaryMax)}`;
        }

        return `
            <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #E5E7EB;">
                <h3 style="margin: 0 0 5px 0; font-size: 18px; font-weight: 600;">
                    <a href="${jobUrl}" style="color: ${primaryColor}; text-decoration: none;">${job.title}</a>
                </h3>
                <p style="margin: 0 0 10px 0; font-size: 14px; color: ${lightTextColor};">${job.companyName} - ${job.location}</p>
                <p style="margin: 0 0 15px 0; font-size: 14px; color: ${textColor};">${job.description?.substring(0, 150) || ''}...</p>
                <div style="font-size: 14px; margin-bottom: 15px;">
                    <span style="display: inline-block; background-color: #E5E7EB; color: ${textColor}; padding: 4px 10px; border-radius: 15px; margin-right: 10px;">
                        ${job.jobType}
                    </span>
                     ${salaryDisplay ? `<span style="display: inline-block; color: ${textColor}; padding: 4px 10px; border-radius: 15px;">${salaryDisplay}</span>` : ''}
                </div>
                <a href="${jobUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                    View & Apply
                </a>
            </div>
        `;
    }).join('');
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Job Alert from Cambodia Hub</title>
    <style>
        body { margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { background-color: ${cardColor}; border-radius: 8px; padding: 30px 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 1px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 20px; }
        .logo { font-size: 28px; font-weight: 700; color: ${primaryColor}; margin-bottom: 10px; }
        .footer { margin-top: 30px; font-size: 12px; color: ${lightTextColor}; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="logo">Cambodia Hub</div>
                <h1 style="font-size: 24px; color: ${textColor}; margin: 0;">New Job Opportunities</h1>
            </div>
            <div style="font-size: 16px; color: ${textColor}; line-height: 1.6;">
                <p>Hi ${userName},</p>
                <p>New jobs matching your saved search criteria have just been posted! Here are your latest matches:</p>
            </div>
            <div style="margin-top: 30px;">
                ${generateJobList()}
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Cambodia Hub. All rights reserved.</p>
            <p>You are receiving this email because you have a saved job search on our platform.</p>
        </div>
    </div>
</body>
</html>
`;
};

module.exports = { jobAlertTemplate };
