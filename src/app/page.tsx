"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
     Row,
     Col,
     Card,
     Statistic,
     Typography,
     Table,
     Tag,
     Space,
     Spin,
     message,
     Modal,
} from "antd";
import {
     ProjectOutlined,
     DollarOutlined,
     TeamOutlined,
     CheckCircleOutlined,
     ClockCircleOutlined,
} from "@ant-design/icons";
import { formatVND } from "@/lib/number-utils";
import { useRouter } from "next/navigation";
import axios from "axios";

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
     DRAFT: "default",
     SUBMITTED: "processing",
     APPROVED: "success",
     ONGOING: "warning",
     COMPLETED: "cyan",
     SUSPENDED: "error",
     ARCHIVED: "default",
};

const STATUS_LABELS: Record<string, string> = {
     DRAFT: "Nháp",
     SUBMITTED: "Đã nộp",
     APPROVED: "Đã duyệt",
     ONGOING: "Đang thực hiện",
     COMPLETED: "Hoàn thành",
     SUSPENDED: "Tạm dừng",
     ARCHIVED: "Lưu trữ",
};

interface DashboardData {
     stats: {
          totalProjects: number;
          ongoingProjects: number;
          completedProjects: number;
          totalBudget: string;
          totalMembers: number;
     };
     recentProjects: any[];
     lists: {
          allProjects: any[];
          ongoingProjects: any[];
          completedProjects: any[];
          users: any[];
     };
}

type ListKey = keyof DashboardData["lists"];

export default function DashboardPage() {
     const router = useRouter();
     const [loading, setLoading] = useState(true);
     const [data, setData] = useState<DashboardData | null>(null);
     const [openList, setOpenList] = useState<ListKey | null>(null);

     useEffect(() => {
          const fetchDashboard = async () => {
               try {
                    const res = await axios.get("/api/dashboard");
                    if (res.data.success) setData(res.data.data);
               } catch {
                    message.error("Không thể tải dữ liệu tổng quan");
               } finally {
                    setLoading(false);
               }
          };
          fetchDashboard();
     }, []);

     const projectColumns = [
          {
               title: "Mã",
               dataIndex: "code",
               key: "code",
               width: 130,
               render: (code: string | null) =>
                    code ? <Text strong>{code}</Text> : <Text type="secondary">-</Text>,
          },
          {
               title: "Tên đề tài / dự án",
               dataIndex: "title",
               key: "title",
               ellipsis: true,
               render: (title: string, record: any) => (
                    <a onClick={() => router.push(`/projects/${record.id}`)}>
                         {title}
                    </a>
               ),
          },
          {
               title: "Chủ nhiệm",
               dataIndex: ["owner", "fullName"],
               key: "owner",
               width: 160,
          },
          {
               title: "Năm",
               dataIndex: "year",
               key: "year",
               width: 80,
               align: "center" as const,
          },
          {
               title: "Kinh phí",
               dataIndex: "totalBudget",
               key: "totalBudget",
               width: 160,
               align: "right" as const,
               render: (val: string | null | undefined) => val == null ? "Không có quyền xem" : formatVND(val) + " VNĐ",
          },
          {
               title: "Trạng thái",
               dataIndex: "status",
               key: "status",
               width: 140,
               render: (status: string) => (
                    <Tag color={STATUS_COLORS[status] || "default"}>
                         {STATUS_LABELS[status] || status}
                    </Tag>
               ),
          },
     ];

     const userColumns = [
          {
               title: "Họ tên",
               dataIndex: "fullName",
               key: "fullName",
          },
          {
               title: "Email",
               dataIndex: "email",
               key: "email",
          },
          {
               title: "Vai trò",
               dataIndex: "role",
               key: "role",
               width: 130,
               render: (role: string) => <Tag color="blue">{role}</Tag>,
          },
          {
               title: "Chức vụ",
               dataIndex: "position",
               key: "position",
          },
          {
               title: "Phòng ban",
               dataIndex: "department",
               key: "department",
          },
     ];

     if (loading) {
          return (
               <AppLayout>
                    <div style={{ textAlign: "center", padding: 100 }}>
                         <Spin size="large" />
                    </div>
               </AppLayout>
          );
     }

     if (!data) return null;

     const listTitles: Record<ListKey, string> = {
          allProjects: "Tất cả đề tài / dự án",
          ongoingProjects: "Đề tài / dự án đang thực hiện",
          completedProjects: "Đề tài / dự án đã hoàn thành",
          users: "Danh sách nhân sự / tài khoản",
     };

     return (
          <AppLayout>
               <div style={{ marginBottom: 24 }}>
                    <Title level={4} style={{ marginBottom: 4 }}>
                         Tổng quan hệ thống
                    </Title>
                    <Text type="secondary">
                         Thống kê tình hình đề tài, dự án và nhân sự
                    </Text>
               </div>

               <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                         <Card
                              hoverable
                              onClick={() => setOpenList("allProjects")}
                              style={{ borderTop: "3px solid #1677ff" }}
                         >
                              <Statistic
                                   title="Tổng số đề tài / dự án"
                                   value={data.stats.totalProjects}
                                   prefix={<ProjectOutlined style={{ color: "#1677ff" }} />}
                              />
                         </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                         <Card
                              hoverable
                              onClick={() => setOpenList("ongoingProjects")}
                              style={{ borderTop: "3px solid #faad14" }}
                         >
                              <Statistic
                                   title="Đang thực hiện"
                                   value={data.stats.ongoingProjects}
                                   prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
                              />
                         </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                         <Card
                              hoverable
                              onClick={() => setOpenList("completedProjects")}
                              style={{ borderTop: "3px solid #52c41a" }}
                         >
                              <Statistic
                                   title="Hoàn thành"
                                   value={data.stats.completedProjects}
                                   prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                              />
                         </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                         <Card
                              hoverable
                              onClick={() => setOpenList("users")}
                              style={{ borderTop: "3px solid #722ed1" }}
                         >
                              <Statistic
                                   title="Nhân sự / tài khoản"
                                   value={data.stats.totalMembers}
                                   prefix={<TeamOutlined style={{ color: "#722ed1" }} />}
                              />
                         </Card>
                    </Col>
               </Row>

               <Card
                    title={
                         <Space>
                              <DollarOutlined />
                              <span>Tổng kinh phí toàn hệ thống</span>
                         </Space>
                    }
                    style={{ marginBottom: 24 }}
               >
                    <Statistic
                         value={data.stats.totalBudget}
                         formatter={(value) => data.stats.totalBudget == null ? "Không có quyền xem" : formatVND(value as string)}
                         suffix="VNĐ"
                    />
               </Card>

               <Card
                    title={
                         <Space>
                              <ProjectOutlined />
                              <span>Đề tài gần đây</span>
                         </Space>
                    }
                    extra={
                         <a onClick={() => setOpenList("allProjects")}>
                              Xem tất cả
                         </a>
                    }
               >
                    <Table
                         dataSource={data.recentProjects}
                         columns={projectColumns}
                         rowKey="id"
                         pagination={false}
                         size="middle"
                    />
               </Card>

               <Modal
                    title={openList ? listTitles[openList] : ""}
                    open={Boolean(openList)}
                    onCancel={() => setOpenList(null)}
                    footer={null}
                    width={1100}
                    destroyOnClose
               >
                    {openList === "users" ? (
                         <Table
                              dataSource={data.lists.users}
                              columns={userColumns}
                              rowKey="id"
                              size="middle"
                              pagination={{ pageSize: 10 }}
                         />
                    ) : (
                         <Table
                              dataSource={
                                   openList ? data.lists[openList] : []
                              }
                              columns={projectColumns}
                              rowKey="id"
                              size="middle"
                              pagination={{ pageSize: 10 }}
                         />
                    )}
               </Modal>
          </AppLayout>
     );
}
