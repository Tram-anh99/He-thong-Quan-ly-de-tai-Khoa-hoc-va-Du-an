'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Typography, Avatar, Dropdown, Space, Spin } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  FileTextOutlined,
  TeamOutlined,
  DollarOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: string;
  position?: string;
  department?: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        if (res.data.success) {
          setUser(res.data.data);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await axios.post('/api/auth/logout');
    router.push('/login');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Tổng quan',
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: 'Đề tài / Dự án',
    },
    {
      key: '/templates',
      icon: <FileTextOutlined />,
      label: 'Biểu mẫu',
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: 'Nhân sự',
    },
    {
      key: '/reports',
      icon: <DollarOutlined />,
      label: 'Báo cáo',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin cá nhân',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const getSelectedKey = () => {
    if (pathname === '/') return ['/'];
    const match = menuItems?.find((item) => {
      if (!item || !('key' in item)) return false;
      return pathname.startsWith(item.key as string) && item.key !== '/';
    });
    return match ? [(match as any).key] : ['/'];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={256}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: '#ffffff',
          borderRight: '1px solid #f0f0f0',
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 24px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <ProjectOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          {!collapsed && (
            <Text strong style={{ marginLeft: 12, fontSize: 14, whiteSpace: 'nowrap' }}>
              QLĐK & Dự án
            </Text>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={getSelectedKey()}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 256, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            position: 'sticky',
            top: 0,
            zIndex: 9,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, color: '#ffffff' }}
          />

          <Space>
            <Text style={{ color: '#ffffff', opacity: 0.85 }}>
              {user?.fullName} — {user?.position || user?.role}
            </Text>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                style={{ backgroundColor: '#ffffff', color: '#1677ff', cursor: 'pointer' }}
                icon={<UserOutlined />}
              />
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: 24,
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
