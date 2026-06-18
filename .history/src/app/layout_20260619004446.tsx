import type { Metadata } from 'next';
import './globals.css';
import AntdRegistry from './AntdRegistry';
import ThemeProvider from './ThemeProvider';

export const metadata: Metadata = {
  title: 'Hệ thống Quản lý Đề tài Khoa học và Dự án',
  description: 'Quản lý đề tài nghiên cứu khoa học, dự án và hồ sơ thanh toán',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AntdRegistry>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
