"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import {
     Card,
     Table,
     Tag,
     Typography,
     Space,
     Select,
     Button,
     Modal,
     Descriptions,
     message,
} from "antd";
import {
     ReloadOutlined,
     EyeOutlined,
     HistoryOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ACTION_COLORS: Record<string, string> = {
     CREATE: "success",
     UPDATE: "processing",
     DELETE: "error",
     EXPORT: "purple",
};

const ACTION_LABELS: Record<string, string> = {
     CREATE: "Tạo mới",
     UPDATE: "Chỉnh sửa",
     DELETE: "Xóa",
     EXPORT: "Xuất dữ liệu",
};

export default function AuditLogsPage() {
     const [logs, setLogs] = useState<any[]>([]);
     const [loading, setLoading] = useState(false);
     const [total, setTotal] = useState(0);
     const [page, setPage] = useState(1);
     const [pageSize, setPageSize] = useState(20);
     const [action, setAction] = useState<string | undefined>(undefined);
     const [entity, setEntity] = useState<string | undefined>(undefined);
     const [selectedLog, setSelectedLog] = useState<any | null>(null);

     const fetchLogs = useCallback(async () => {
          setLoading(true);
          try {
               const params = new URLSearchParams();
               params.set("page", String(page));
               params.set("pageSize", String(pageSize));
               if (action) params.set("action", action);
               if (entity) params.set("entity", entity);

               const res = await axios.get(
                    `/api/audit-logs?${params.toString()}`,
               );
               if (res.data.success) {
                    setLogs(res.data.data);
                    setTotal(res.data.pagination.total);
               }
          } catch (err: any) {
               message.error(
                    err.response?.data?.error || "Không thể tải lịch sử",
               );
          } finally {
               setLoading(false);
          }
     }, [page, pageSize, action, entity]);

     useEffect(() => {
          fetchLogs();
     }, [fetchLogs]);

     const columns = [
          {
               title: "Thời gian",
               dataIndex: "createdAt",
               key: "createdAt",
               width: 180,
               render: (value: string) =>
                    dayjs(value).format("DD/MM/YYYY HH:mm:ss"),
          },
          {
               title: "Tài khoản thực hiện",
               dataIndex: "actor",
               key: "actor",
               width: 230,
               render: (actor: any) =>
                    actor ? (
                         <Space direction="vertical" size={0}>
                              <Text strong>{actor.fullName}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                   {actor.email} - {actor.role}
                              </Text>
                         </Space>
                    ) : (
                         <Text type="secondary">Không xác định</Text>
                    ),
          },
          {
               title: "Thao tác",
               dataIndex: "action",
               key: "action",
               width: 130,
               render: (value: string) => (
                    <Tag color={ACTION_COLORS[value] || "default"}>
                         {ACTION_LABELS[value] || value}
                    </Tag>
               ),
          },
          {
               title: "Đối tượng",
               dataIndex: "entity",
               key: "entity",
               width: 130,
          },
          {
               title: "ID dữ liệu",
               dataIndex: "entityId",
               key: "entityId",
               ellipsis: true,
          },
          {
               title: "IP",
               dataIndex: "ipAddress",
               key: "ipAddress",
               width: 130,
               render: (value: string | null) => value || "-",
          },
          {
               title: "Chi tiết",
               key: "details",
               width: 90,
               align: "center" as const,
               render: (_: any, record: any) => (
                    <Button
                         type="text"
                         icon={<EyeOutlined />}
                         onClick={() => setSelectedLog(record)}
                    />
               ),
          },
     ];

     return (
          <AppLayout>
               <div style={{ marginBottom: 24 }}>
                    <Title level={4} style={{ marginBottom: 4 }}>
                         <HistoryOutlined /> Lịch sử thao tác
                    </Title>
                    <Text type="secondary">
                         Admin theo dõi các thay đổi dữ liệu quan trọng trong hệ thống
                    </Text>
               </div>

               <Card style={{ marginBottom: 16 }}>
                    <Space wrap>
                         <Select
                              placeholder="Loại thao tác"
                              allowClear
                              value={action}
                              onChange={setAction}
                              style={{ width: 180 }}
                         >
                              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                                   <Option key={key} value={key}>
                                        {label}
                                   </Option>
                              ))}
                         </Select>
                         <Select
                              placeholder="Đối tượng"
                              allowClear
                              value={entity}
                              onChange={setEntity}
                              style={{ width: 180 }}
                         >
                              <Option value="Project">Đề tài / Dự án</Option>
                         </Select>
                         <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
                              Làm mới
                         </Button>
                    </Space>
               </Card>

               <Card>
                    <Table
                         dataSource={logs}
                         columns={columns}
                         rowKey="id"
                         loading={loading}
                         size="middle"
                         pagination={{
                              current: page,
                              pageSize,
                              total,
                              showSizeChanger: true,
                              showTotal: (value) =>
                                   `Tổng ${value} bản ghi lịch sử`,
                              onChange: (p, ps) => {
                                   setPage(p);
                                   setPageSize(ps);
                              },
                         }}
                    />
               </Card>

               <Modal
                    title="Chi tiết lịch sử thao tác"
                    open={Boolean(selectedLog)}
                    onCancel={() => setSelectedLog(null)}
                    footer={null}
                    width={860}
                    destroyOnClose
               >
                    {selectedLog && (
                         <Space direction="vertical" style={{ width: "100%" }}>
                              <Descriptions bordered column={1} size="small">
                                   <Descriptions.Item label="Thời gian">
                                        {dayjs(selectedLog.createdAt).format(
                                             "DD/MM/YYYY HH:mm:ss",
                                        )}
                                   </Descriptions.Item>
                                   <Descriptions.Item label="Tài khoản">
                                        {selectedLog.actor
                                             ? `${selectedLog.actor.fullName} (${selectedLog.actor.email})`
                                             : "Không xác định"}
                                   </Descriptions.Item>
                                   <Descriptions.Item label="Thao tác">
                                        <Tag
                                             color={
                                                  ACTION_COLORS[
                                                       selectedLog.action
                                                  ] || "default"
                                             }
                                        >
                                             {ACTION_LABELS[
                                                  selectedLog.action
                                             ] || selectedLog.action}
                                        </Tag>
                                   </Descriptions.Item>
                                   <Descriptions.Item label="Đối tượng">
                                        {selectedLog.entity} -{" "}
                                        {selectedLog.entityId}
                                   </Descriptions.Item>
                                   <Descriptions.Item label="IP">
                                        {selectedLog.ipAddress || "-"}
                                   </Descriptions.Item>
                              </Descriptions>
                              <Card size="small" title="Dữ liệu ghi nhận">
                                   <Paragraph>
                                        <pre
                                             style={{
                                                  margin: 0,
                                                  whiteSpace: "pre-wrap",
                                                  wordBreak: "break-word",
                                             }}
                                        >
                                             {JSON.stringify(
                                                  selectedLog.payload,
                                                  null,
                                                  2,
                                             )}
                                        </pre>
                                   </Paragraph>
                              </Card>
                         </Space>
                    )}
               </Modal>
          </AppLayout>
     );
}
