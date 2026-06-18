'use client';

import React from 'react';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          colorBgLayout: '#f0f2f5',
          colorBgContainer: '#ffffff',
        },
        components: {
          Layout: {
            headerBg: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            siderBg: '#ffffff',
          },
          Menu: {
            itemSelectedBg: '#e6f4ff',
            itemSelectedColor: '#1677ff',
          },
          Table: {
            headerBg: '#fafafa',
            headerColor: '#262626',
          },
          Card: {
            headerFontSize: 16,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
