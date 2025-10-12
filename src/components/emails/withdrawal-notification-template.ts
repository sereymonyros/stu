
interface WithdrawalNotificationProps {
  recruiterName: string;
  applicantName: string;
  jobTitle: string;
}

export const withdrawalNotificationTemplate = ({
  recruiterName,
  applicantName,
  jobTitle,
}: WithdrawalNotificationProps): string => {
  const primaryColor = '#4F46E5'; // Example: Indigo 600
  const backgroundColor = '#F3F4F6'; // Example: Gray 100
  const textColor = '#1F2937'; // Example: Gray 800
  const lightTextColor = '#6B7280'; // Example: Gray 500

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Withdrawn</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: ${backgroundColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .card {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            font-size: 24px;
            font-weight: 600;
            color: ${textColor};
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: ${primaryColor};
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            color: ${textColor};
            line-height: 1.6;
            margin-top: 20px;
            text-align: left;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: ${lightTextColor};
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">Cambodia Hub</div>
            <h1 class="header">Application Withdrawn</h1>
            <div class="content">
                <p>Hi ${recruiterName},</p>
                <p>Please be advised that <strong>${applicantName}</strong> has withdrawn their application for the position of <strong>${jobTitle}</strong>.</p>
                <p>No further action is required.</p>
                <br/>
                <p><em>The Cambodia Hub Team</em></p>
            </div>            
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Cambodia Hub. All rights reserved.</p>
            <p>You are receiving this email because you are the recruiter for this job posting.</p>
        </div>
    </div>
</body>
</html>
`;
};
