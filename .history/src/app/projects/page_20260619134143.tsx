"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import {
     Table,
     Button,
     Input,
     Select,
     Tag,
     Space,
     Card,
     Typography,
     Row,
     Col,
     Modal,
     Form,
     InputNumber,
     DatePicker,
     message,
     Tooltip,
     Popconfirm,
} from "antd";
import {
     PlusOutlined,
     SearchOutlined,
     EditOutlined,
     DeleteOutlined,
     EyeOutlined,
     ReloadOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { formatVND } from "@/lib/number-utils";
import axios from "axios";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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
const FUNDING_SOURCES = [
     "Kinh phí ngân sách nhà nước",
     "Kinh phí viện phí",
     "Kinh phí hợp đồng",
     "Kinh phí địa phương",
     "Kinh phí viện trợ (ODA)",
     "Khác",
];

interface Project {
     id: string;
     code: string | null;
     title: string;
     summary: string | null;
     ownerId: string;
     totalBudget: string;
     fundingSource: string | null;
     startDate: string | null;
     endDate: string | null;
     year: number;
     status: string;
     owner: {
          id: string;
          fullName: string;
          position: string | null;
          department: string | null;
     };
     _count: {
          members: number;
          budgetItems: number;
          contracts: number;
          products: number;
     };
}

export default function ProjectsPage() {
     const router = useRouter();
     const [projects, setProjects] = useState<Project[]>([]);
     const [loading, setLoading] = useState(false);
     const [total, setTotal] = useState(0);
     const [page, setPage] = useState(1);
     const [pageSize, setPageSize] = useState(10);
     const [search, setSearch] = useState("");
     const [filterYear, setFilterYear] = useState<number | undefined>(
          undefined,
     );
     const [filterStatus, setFilterStatus] = useState<string | undefined>(
          undefined,
     );
     const [modalOpen, setModalOpen] = useState(false);
     const [form] = Form.useForm();

     const currentYear = new Date().getFullYear();
     const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

     const fetchProjects = useCallback(async () => {
          setLoading(true);
          try {
               const params = new URLSearchParams();
               params.set("page", String(page));
               params.set("pageSize", String(pageSize));
               if (search) params.set("search", search);
               if (filterYear) params.set("year", String(filterYear));
               if (filterStatus) params.set("status", filterStatus);

               const res = await axios.get(
                    `/api/projects?${params.toString()}`,
               );
               if (res.data.success) {
                    setProjects(res.data.data);
                    setTotal(res.data.pagination.total);
               }
          } catch {
               message.error("Không thể tải danh sách dự án");
          } finally {
               setLoading(false);
          }
     }, [page, pageSize, search, filterYear, filterStatus]);

     useEffect(() => {
          fetchProjects();
     }, [fetchProjects]);

     const handleCreate = async (values: any) => {
          try {
               const payload = {
                    ...values,
                    startDate: values.startDate?.toISOString(),
                    endDate: values.endDate?.toISOString(),
               };
               const res = await axios.post("/api/projects", payload);
               if (res.data.success) {
                    message.success("Tạo dự án thành công!");
                    setModalOpen(false);
                    form.resetFields();
                    fetchProjects();
               } else {
                    message.error(res.data.error);
               }
          } catch (err: any) {
               message.error(
                    err.response?.data?.error || "Không thể tạo dự án",
               );
          }
     };

     const handleDelete = async (id: string) => {
          try {
               const res = await axios.delete(`/api/projects/${id}`);
               if (res.data.success) {
                    message.success("Đã xóa dự án");
                    fetchProjects();
               }
          } catch (err: any) {
               message.error(
                    err.response?.data?.error || "Không thể xóa dự án",
               );
          }
     };

     const columns = [
          {
               title: "Mã",
               dataIndex: "code",
               key: "code",
               width: 130,
               render: (code: string | null) =>
                    code ? (
                         <Text strong>{code}</Text>
                    ) : (
                         <Text type="secondary">—</Text>
                    ),
          },
          {
               title: "Tên đề tài / dự án",
               dataIndex: "title",
               key: "title",
               ellipsis: true,
               render: (title: string, record: Project) => (
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
               width: 70,
               align: "center" as const,
          },
          {
               title: "Kinh phí",
               dataIndex: "totalBudget",
               key: "totalBudget",
               width: 170,
               align: "right" as const,
               render: (val: string) => formatVND(val) + " VNĐ",
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
          {
               title: "Thao tác",
               key: "actions",
               width: 100,
               align: "center" as const,
               render: (_: any, record: Project) => (
                    <Space size="small">
                         <Tooltip title="Xem chi tiết">
                              <Button
                                   type="text"
                                   size="small"
                                   icon={<EyeOutlined />}
                                   onClick={() =>
                                        router.push(`/projects/${record.id}`)
                                   }
                              />
                         </Tooltip>
                         <Popconfirm
                              title="Xác nhận xóa?"
                              onConfirm={() => handleDelete(record.id)}
                         >
                              <Tooltip title="Xóa">
                                   <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                   />
                              </Tooltip>
                         </Popconfirm>
                    </Space>
               ),
          },
     ];

     return (
          <AppLayout>
               <div style={{ marginBottom: 24 }}>
                    <Title level={4} style={{ marginBottom: 4 }}>
                         📋 Danh sách Đề tài / Dự án
                    </Title>
                    <Text type="secondary">
                         Quản lý tất cả đề tài nghiên cứu khoa học và dự án
                    </Text>
               </div>

               {/* Filters */}
               <Card style={{ marginBottom: 16 }}>
                    <Row gutter={[12, 12]} align="middle">
                         <Col flex="auto">
                              <Space wrap>
                                   <Input
                                        placeholder="Tìm kiếm tên, mã đề tài..."
                                        prefix={<SearchOutlined />}
                                        value={search}
                                        onChange={(e) =>
                                             setSearch(e.target.value)
                                        }
                                        style={{ width: 280 }}
                                        allowClear
                                   />
                                   <Select
                                        placeholder="Năm"
                                        value={filterYear}
                                        onChange={setFilterYear}
                                        allowClear
                                        style={{ width: 120 }}
                                   >
                                        {years.map((y) => (
                                             <Option key={y} value={y}>
                                                  {y}
                                             </Option>
                                        ))}
                                   </Select>
                                   <Select
                                        placeholder="Trạng thái"
                                        value={filterStatus}
                                        onChange={setFilterStatus}
                                        allowClear
                                        style={{ width: 180 }}
                                   >
                                        {Object.entries(STATUS_LABELS).map(
                                             ([key, label]) => (
                                                  <Option key={key} value={key}>
                                                       {label}
                                                  </Option>
                                             ),
                                        )}
                                   </Select>
                                   <Button
                                        icon={<ReloadOutlined />}
                                        onClick={fetchProjects}
                                   >
                                        Làm mới
                                   </Button>
                              </Space>
                         </Col>
                         <Col>
                              <Button
                                   type="primary"
                                   icon={<PlusOutlined />}
                                   onClick={() => setModalOpen(true)}
                              >
                                   Tạo mới
                              </Button>
                         </Col>
                    </Row>
               </Card>

               {/* Table */}
               <Card>
                    <Table
                         dataSource={projects}
                         columns={columns}
                         rowKey="id"
                         loading={loading}
                         size="middle"
                         pagination={{
                              current: page,
                              pageSize,
                              total,
                              showSizeChanger: true,
                              showTotal: (total) => `Tổng ${total} dự án`,
                              onChange: (p, ps) => {
                                   setPage(p);
                                   setPageSize(ps);
                              },
                         }}
                    />
               </Card>

               {/* Create Project Modal */}
               <Modal
                    title="➕ Tạo Đề tài / Dự án mới"
                    open={modalOpen}
                    onCancel={() => {
                         setModalOpen(false);
                         form.resetFields();
                    }}
                    footer={null}
                    width={720}
                    destroyOnClose
               >
                    <Form
                         form={form}
                         layout="vertical"
                         onFinish={handleCreate}
                         initialValues={{ year: currentYear, status: "DRAFT" }}
                    >
                         <Row gutter={16}>
                              <Col span={8}>
                                   <Form.Item label="Mã đề tài" name="code">
                                        <Input placeholder="DT-2025-XXX" />
                                   </Form.Item>
                              </Col>
                              <Col span={8}>
                                   <Form.Item
                                        label="Năm thực hiện"
                                        name="year"
                                        rules={[
                                             {
                                                  required: true,
                                                  message: "Bắt buộc",
                                             },
                                        ]}
                                   >
                                        <InputNumber
                                             style={{ width: "100%" }}
                                             min={2020}
                                             max={2030}
                                        />
                                   </Form.Item>
                              </Col>
                              <Col span={8}>
                                   <Form.Item label="Trạng thái" name="status">
                                        <Select>
                                             {Object.entries(STATUS_LABELS).map(
                                                  ([key, label]) => (
                                                       <Option
                                                            key={key}
                                                            value={key}
                                                       >
                                                            {label}
                                                       </Option>
                                                  ),
                                             )}
                                        </Select>
                                   </Form.Item>
                              </Col>
                         </Row>

                         <Form.Item
                              label="Tên đề tài / dự án"
                              name="title"
                              rules={[
                                   {
                                        required: true,
                                        message: "Vui lòng nhập tên đề tài",
                                   },
                              ]}
                         >
                              <Input placeholder="Nhập tên đề tài hoặc dự án" />
                         </Form.Item>

                         <Form.Item label="Tóm tắt" name="summary">
                              <TextArea
                                   rows={2}
                                   placeholder="Mô tả ngắn gọn về đề tài"
                              />
                         </Form.Item>

                         <Row gutter={16}>
                              <Col span={8}>
                                   <Form.Item
                                        label="Tổng kinh phí (VNĐ)"
                                        name="totalBudget"
                                   >
                                        <InputNumber
                                             style={{ width: "100%" }}
                                             min={0}
                                             step={1000000}
                                             formatter={(value) =>
                                                  `${value}`.replace(
                                                       /\B(?=(\d{3})+(?!\d))/g,
                                                       ",",
                                                  )
                                             }
                                             parser={(value) =>
                                                  Number(
                                                       value!.replace(/,/g, ""),
                                                  ) as any
                                             }
                                             placeholder="0"
                                        />
                                   </Form.Item>
                              </Col>
                              <Col span={16}>
                                   <Form.Item
                                        label="Nguồn kinh phí"
                                        name="fundingSource"
                                   >
                                        <Select
                                             allowClear
                                             placeholder="Chọn nguồn kinh phí"
                                        >
                                             {FUNDING_SOURCES.map((src) => (
                                                  <Option key={src} value={src}>
                                                       {src}
                                                  </Option>
                                             ))}
                                        </Select>
                                   </Form.Item>
                              </Col>
                         </Row>

                         <Row gutter={16}>
                              <Col span={12}>
                                   <Form.Item
                                        label="Ngày bắt đầu"
                                        name="startDate"
                                   >
                                        <DatePicker
                                             style={{ width: "100%" }}
                                             format="DD/MM/YYYY"
                                             placeholder="Chọn ngày"
                                        />
                                   </Form.Item>
                              </Col>
                              <Col span={12}>
                                   <Form.Item
                                        label="Ngày kết thúc"
                                        name="endDate"
                                   >
                                        <DatePicker
                                             style={{ width: "100%" }}
                                             format="DD/MM/YYYY"
                                             placeholder="Chọn ngày"
                                        />
                                   </Form.Item>
                              </Col>
                         </Row>

                         <Form.Item
                              style={{ textAlign: "right", marginBottom: 0 }}
                         >
                              <Space>
                                   <Button
                                        onClick={() => {
                                             setModalOpen(false);
                                             form.resetFields();
                                        }}
                                   >
                                        Hủy
                                   </Button>
                                   <Button type="primary" htmlType="submit">
                                        Tạo dự án
                                   </Button>
                              </Space>
                         </Form.Item>
                    </Form>
               </Modal>
          </AppLayout>
     );
}
                                   >