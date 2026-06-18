'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Space } from 'antd';
import {
  ProjectOutlined,
  DollarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { formatVND } from '@/lib/number-utils';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default',
  SUBMITTED: 'processing',
  APPROVED: 'success',
  ONGOING: 'warning',
  COMPLETED: 'cyan',
  SUSPENDED: 'error',
  ARCHIVED: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã nộp',
  APPROVED: 'Đã duyệt',
  ONGOING: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  SUSPENDED: 'Tạm dừng',
  ARCHIVED: 'Lưu trữ',
};

export default function DashboardPage() {
  const router = useRouter();

  // Mock stats — will be replaced with API calls
  const stats = {
    totalProjects: 12,
    ongoingProjects: 5,
    completedProjects: 4,
    totalBudget: 3500000000,
    totalMembers: 28,
  };

  const recentProjects = [
    {
      id: '1',
      code: 'DT-2025-001',
      title: 'Nghiên cứu ứng dụng Trí tuệ nhân tạo trong quản lý tài liệu khoa học',
      ownerName: 'Nguyễn Văn A',
      status: 'ONGOING',
      year: 2025,
      totalBudget: 500000000,
    },
    {
      id: '2',
      code: 'DT-2025-002',
      title: 'Xây dựng hệ thống IoT giám sát môi trường thông minh',
      ownerName: 'Trần Thị B',
      status: 'APPROVED',
      year: 2025,
      totalBudget: 800000000,
    },
    {
      id: '3',
      code: 'DA-2024-005',
      title: 'Dự án chuyển đổi số cho thư viện đại học',
      ownerName: 'Lê Văn C',
      status: 'COMPLETED',
      year: 2024,
      totalBudget: 1200000000,
    },
  ];

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: 'Tên đề tài / dự án',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Chủ nhiệm',
      dataIndex: 'ownerName',
      key: 'ownerName',
      width: 150,
    },
    {
      title: 'Năm',
      dataIndex: 'year',
      key: 'year',
      width: 70,
      align: 'center' as const,
    },
    {
      title: 'Kinh phí',
      dataIndex: 'totalBudget',
      key: 'totalBudget',
      width: 160,
      align: 'right' as const,
      render: (val: number) => formatVND(val) + ' VNĐ',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>{STATUS_LABELS[status] || status}</Tag>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 4 }}>
          📊 Tổng quan hệ thống
        </Title>
        <Text type="secondary">Thống kê tình hình đề tài và dự án</Text>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderTop: '3px solid #1677ff' }}>
            <Statistic
              title="Tổng số đề tài / dự án"
              value={stats.totalProjects}
              prefix={<ProjectOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderTop: '3px solid #faad14' }}>
            <Statistic
              title="Đang thực hiện"
              value={stats.ongoingProjects}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic
              title="Hoàn thành"
              value={stats.completedProjects}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic
              title="Tổng kinh phí"
              value={stats.totalBudget}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              formatter={(value) => formatVND(value as number)}
              suffix="VNĐ"
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Projects Table */}
      <Card
        title={
          <Space>
            <ProjectOutlined />
            <span>Đề tài gần đây</span>
          </Space>
        }
        extra={
          <a onClick={() => router.push('/projects')}>Xem tất cả →</a>
        }
      >
        <Table
          dataSource={recentProjects}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
          onRow={(record) => ({
            onClick: () => router.push(`/projects/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </AppLayout>
  );
}
