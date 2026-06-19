"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import {
     Card, Tabs, Descriptions, Tag, Typography, Space, Button, Table,
     Empty, message, Spin, Divider, Row, Col, Statistic, List, Upload,
} from "antd";
import {
     ArrowLeftOutlined, EditOutlined, TeamOutlined, DollarOutlined,
     FileTextOutlined, UploadOutlined, DownloadOutlined, DeleteOutlined,
     PlusOutlined, FileWordOutlined, FilePdfOutlined, CodeOutlined,
} from "@ant-design/icons";
import { formatVND, formatCurrency, amountToWords, formatDate } from "@/lib/number-utils";
import axios from "axios";

const { Title, Text, Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
     DRAFT: "default", SUBMITTED: "processing", APPROVED: "success",
     ONGOING: "warning", COMPLETED: "cyan", SUSPENDED: "error", ARCHIVED: "default",
};
const STATUS_LABELS: Record<string, string> = {
     DRAFT: "Nháp", SUBMITTED: "Đã nộp", APPROVED: "Đã duyệt",
     ONGOING: "Đang thực hiện", COMPLETED: "Hoàn thành", SUSPENDED: "Tạm dừng", ARCHIVED: "Lưu trữ",
};

export default function ProjectDetailPage() {
     const params = useParams();
     const router = useRouter();
     const projectId = params?.id as string;
     const [project, setProject] = useState<any>(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => { fetchProject(); }, [projectId]);

     const fetchProject = async () => {
          setLoading(true);
          try {
               const res = await axios.get(`/api/projects/${projectId}`);
               if (res.data.success) { setProject(res.data.data); }
               else { message.error("Không tìm thấy dự án"); router.push("/projects"); }
          } catch { message.error("Lỗi tải dữ liệu"); router.push("/projects"); }
          finally { setLoading(false); }
     };

     if (loading) {
          return (<AppLayout><div style={{ textAlign: "center", padding: 100 }}><Spin size="large" tip="Đang tải thông tin dự án..." /></div></AppLayout>);
     }
     if (!project) return null;

     const totalBudgetPlanned = project.budgetItems?.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0) || 0;
     const totalBudgetPaid = project.paymentRecords?.reduce((sum: number, r: any) => r.status === "COMPLETED" ? sum + Number(r.amount || 0) : sum, 0) || 0;

     const BUDGET_STATUS_MAP: Record<string, { color: string; label: string }> = {
          planned: { color: "default", label: "Dự kiến" },
          approved: { color: "success", label: "Đã duyệt" },
          in_progress: { color: "processing", label: "Đang thực hiện" },
          completed: { color: "cyan", label: "Hoàn thành" },
          paid: { color: "green", label: "Đã thanh toán" },
     };

     const CONTRACT_STATUS_MAP: Record<string, { color: string; label: string }> = {
          DRAFT: { color: "default", label: "Nháp" },
          SIGNED: { color: "success", label: "Đã ký" },
          IN_PROGRESS: { color: "processing", label: "Đang thực hiện" },
          COMPLETED: { color: "cyan", label: "Hoàn thành" },
     };

     const tabItems = [
          { key: "info", label: <span><FileTextOutlined /> Thông tin & Thuyết minh</span>, children: (
               <Card>
                    <Descriptions bordered column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }} size="middle">
                         <Descriptions.Item label="Mã đề tài"><Text strong copyable>{project.code || "—"}</Text></Descriptions.Item>
                         <Descriptions.Item label="Tên đề tài" span={2}><Text strong>{project.title}</Text></Descriptions.Item>
                         <Descriptions.Item label="Chủ nhiệm"><Space>{project.owner?.fullName}{project.owner?.position && <Text type="secondary">({project.owner.position})</Text>}</Space></Descriptions.Item>
                         <Descriptions.Item label="Bộ môn / Phòng ban">{project.owner?.department || "—"}</Descriptions.Item>
                         <Descriptions.Item label="Năm thực hiện"><Tag color="blue">{project.year}</Tag></Descriptions.Item>
                         <Descriptions.Item label="Tổng kinh phí"><Text strong style={{ color: "#cf1322" }}>{formatCurrency(project.totalBudget)}</Text></Descriptions.Item>
                         <Descriptions.Item label="Bằng chữ" span={2}><Text italic>{amountToWords(project.totalBudget)}</Text></Descriptions.Item>
                         <Descriptions.Item label="Nguồn kinh phí">{project.fundingSource || "—"}</Descriptions.Item>
                         <Descriptions.Item label="Thời gian thực hiện">{formatDate(project.startDate)} — {formatDate(project.endDate)}</Descriptions.Item>
                         <Descriptions.Item label="Trạng thái"><Tag color={STATUS_COLORS[project.status]}>{STATUS_LABELS[project.status]}</Tag></Descriptions.Item>
                    </Descriptions>
                    <Divider orientation="left">Tóm tắt</Divider>
                    <Paragraph>{project.summary || <Text type="secondary">Chưa có tóm tắt</Text>}</Paragraph>
                    <Divider orientation="left">Thuyết minh</Divider>
                    {project.fullText ? (
                         <Card size="small" style={{ background: "#fafafa" }} styles={{ body: { padding: 16 } }}>
                              <div dangerouslySetInnerHTML={{ __html: project.fullText }} />
                         </Card>
                    ) : (
                         <Empty description="Chưa có thuyết minh" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                              <Button type="primary" icon={<EditOutlined />}>Soạn thuyết minh</Button>
                         </Empty>
                    )}
               </Card>
          )},
          { key: "members", label: <span><TeamOutlined /> Nhân sự</span>, children: (
               <Card title="Danh sách nhân sự tham gia" extra={<Button type="primary" size="small" icon={<PlusOutlined />}>Thêm thành viên</Button>}>
                    <Table dataSource={project.members || []} rowKey="id" size="middle" pagination={false} columns={[
                         { title: "STT", width: 60, align: "center" as const, render: (_: any, __: any, index: number) => index + 1 },
                         { title: "Họ và tên", dataIndex: ["user", "fullName"], key: "fullName" },
                         { title: "Chức vụ", dataIndex: ["user", "position"], key: "position" },
                         { title: "Bộ môn", dataIndex: ["user", "department"], key: "department" },
                         { title: "Vai trò", dataIndex: "roleInProject", key: "roleInProject", render: (role: string) => <Tag color={role === "Chủ nhiệm" ? "blue" : "default"}>{role || "—"}</Tag> },
                         { title: "Tỷ lệ (%)", dataIndex: "allocation", key: "allocation", align: "center" as const, render: (val: string) => val ? `${val}%` : "—" },
                         { title: "Thao tác", key: "actions", width: 80, render: () => <Button type="text" size="small" danger icon={<DeleteOutlined />} /> },
                    ]} />
               </Card>
          )},
          { key: "budget", label: <span><DollarOutlined /> Ngân sách & Dự toán</span>, children: (
               <>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                         <Col span={8}><Card><Statistic title="Tổng kinh phí được duyệt" value={Number(project.totalBudget)} formatter={(v) => formatVND(v as number) + " VNĐ"} valueStyle={{ color: "#1677ff" }} /></Card></Col>
                         <Col span={8}><Card><Statistic title="Kinh phí dự toán" value={totalBudgetPlanned} formatter={(v) => formatVND(v as number) + " VNĐ"} valueStyle={{ color: "#faad14" }} /></Card></Col>
                         <Col span={8}><Card><Statistic title="Đã thanh toán" value={totalBudgetPaid} formatter={(v) => formatVND(v as number) + " VNĐ"} valueStyle={{ color: "#52c41a" }} /></Card></Col>
                    </Row>
                    <Card title="Hạng mục dự toán" extra={<Space><Upload showUploadList={false} accept=".xlsx,.xls,.pdf"><Button icon={<UploadOutlined />}>Upload file dự toán</Button></Upload><Button type="primary" size="small" icon={<PlusOutlined />}>Thêm hạng mục</Button></Space>}>
                         <Table dataSource={project.budgetItems || []} rowKey="id" size="middle" pagination={false}
                              summary={() => (<Table.Summary.Row><Table.Summary.Cell index={0} colSpan={3} align="right"><Text strong>Tổng cộng:</Text></Table.Summary.Cell><Table.Summary.Cell index={3} align="right"><Text strong style={{ color: "#cf1322" }}>{formatCurrency(totalBudgetPlanned)}</Text></Table.Summary.Cell><Table.Summary.Cell index={4} colSpan={3} /></Table.Summary.Row>)}
                              columns={[
                                   { title: "STT", width: 60, align: "center" as const, render: (_: any, __: any, index: number) => index + 1 },
                                   { title: "Tên công việc", dataIndex: "title", key: "title" },
                                   { title: "Mô tả", dataIndex: "description", key: "description", ellipsis: true },
                                   { title: "Kinh phí (VNĐ)", dataIndex: "amount", key: "amount", align: "right" as const, render: (val: string) => formatVND(val) },
                                   { title: "Người thực hiện", dataIndex: ["assignedTo", "fullName"], key: "assignedTo", render: (name: string) => name || <Text type="secondary">Chưa phân công</Text> },
                                   { title: "Trạng thái", dataIndex: "status", key: "status", render: (status: string) => { const s = BUDGET_STATUS_MAP[status] || { color: "default", label: status }; return <Tag color={s.color}>{s.label}</Tag>; }},
                                   { title: "Thao tác", key: "actions", width: 120, render: () => <Space size="small"><Button type="text" size="small" icon={<FileWordOutlined />} /><Button type="text" size="small" icon={<EditOutlined />} /></Space> },
                              ]}
                         />
                    </Card>
               </>
          )},
          { key: "products", label: <span><FileTextOutlined /> Quyết định & Sản phẩm</span>, children: (
               <Row gutter={16}>
                    <Col span={12}>
                         <Card title="📁 Tài liệu đính kèm" extra={<Upload showUploadList={false}><Button icon={<UploadOutlined />} size="small">Upload</Button></Upload>}>
                              {project.documents?.length > 0 ? (
                                   <List dataSource={project.documents} renderItem={(doc: any) => (
                                        <List.Item actions={[<Button key="dl" type="link" size="small" icon={<DownloadOutlined />}>Tải</Button>]}>
                                             <List.Item.Meta avatar={doc.fileType?.includes("pdf") ? <FilePdfOutlined style={{ fontSize: 24, color: "#ff4d4f" }} /> : <FileWordOutlined style={{ fontSize: 24, color: "#1677ff" }} />} title={doc.name} description={<Space><Text type="secondary">{doc.category || "Tài liệu"}</Text><Text type="secondary">• {formatDate(doc.createdAt)}</Text></Space>} />
                                        </List.Item>
                                   )} />
                              ) : <Empty description="Chưa có tài liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                         </Card>
                    </Col>
                    <Col span={12}>
                         <Card title="📦 Sản phẩm giao nộp" extra={<Button type="primary" size="small" icon={<PlusOutlined />}>Thêm sản phẩm</Button>}>
                              {project.products?.length > 0 ? (
                                   <List dataSource={project.products} renderItem={(product: any) => (
                                        <List.Item actions={product.fileUrl ? [<Button key="dl" type="link" size="small" icon={<DownloadOutlined />}>Tải</Button>] : []}>
                                             <List.Item.Meta avatar={product.fileType === "code" ? <CodeOutlined style={{ fontSize: 24, color: "#722ed1" }} /> : product.fileType === "pdf" ? <FilePdfOutlined style={{ fontSize: 24, color: "#ff4d4f" }} /> : <FileWordOutlined style={{ fontSize: 24, color: "#1677ff" }} />} title={product.title} description={<Space direction="vertical" size={0}><Text type="secondary">{product.description || "—"}</Text><Text type="secondary" style={{ fontSize: 12 }}>Giao nộp: {formatDate(product.deliverDate)}</Text></Space>} />
                                        </List.Item>
                                   )} />
                              ) : <Empty description="Chưa có sản phẩm" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                         </Card>
                    </Col>
                    <Col span={24} style={{ marginTop: 16 }}>
                         <Card title="📝 Hợp đồng khoán chuyên môn">
                              {project.contracts?.length > 0 ? (
                                   <Table dataSource={project.contracts} rowKey="id" size="middle" pagination={false} columns={[
                                        { title: "Số HĐ", dataIndex: "contractNo", width: 130 },
                                        { title: "Tên hợp đồng", dataIndex: "title", ellipsis: true },
                                        { title: "Người ký", dataIndex: ["user", "fullName"], width: 140 },
                                        { title: "Kinh phí", dataIndex: "amount", width: 150, align: "right" as const, render: (v: string) => formatVND(v) + " VNĐ" },
                                        { title: "Trạng thái", dataIndex: "status", width: 120, render: (s: string) => { const st = CONTRACT_STATUS_MAP[s] || { color: "default", label: s }; return <Tag color={st.color}>{st.label}</Tag>; }},
                                   ]} />
                              ) : (
                                   <Empty description="Chưa có hợp đồng" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                                        <Button type="primary" icon={<PlusOutlined />}>Tạo hợp đồng</Button>
                                   </Empty>
                              )}
                         </Card>
                    </Col>
               </Row>
          )},
     ];

     return (
          <AppLayout>
               <div style={{ marginBottom: 16 }}>
                    <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push("/projects")} style={{ marginBottom: 8 }}>Quay lại danh sách</Button>
                    <Title level={4} style={{ marginBottom: 4 }}>
                         {project.code && <Tag color="blue" style={{ marginRight: 8 }}>{project.code}</Tag>}
                         {project.title}
                    </Title>
                    <Text type="secondary">
                         Chủ nhiệm: {project.owner?.fullName} • {project.year} •{" "}
                         <Tag color={STATUS_COLORS[project.status]}>{STATUS_LABELS[project.status]}</Tag>
                    </Text>
               </div>
               <Tabs activeKey={undefined} items={tabItems} destroyInactiveTabPane={false} />
          </AppLayout>
     );
}
