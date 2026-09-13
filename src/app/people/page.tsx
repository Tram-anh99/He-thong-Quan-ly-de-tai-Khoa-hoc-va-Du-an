"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
     Button,
     Card,
     Checkbox,
     Form,
     Input,
     Modal,
     Popconfirm,
     Select,
     Space,
     Table,
     Tag,
     Typography,
     message,
} from "antd";
import {
     EditOutlined,
     LinkOutlined,
     PlusOutlined,
     SearchOutlined,
     StopOutlined,
     UserOutlined,
} from "@ant-design/icons";
import axios from "axios";
import type { ColumnsType } from "antd/es/table";
import AppLayout from "@/components/AppLayout";

const { Title, Text } = Typography;

interface Account {
     id: string;
     email: string;
     fullName: string;
     role: string;
     isActive: boolean;
}

interface Person {
     id: string;
     userId: string | null;
     fullName: string;
     email: string | null;
     phoneNumber: string | null;
     position: string | null;
     department: string | null;
     isActive: boolean;
     account: Account | null;
}

interface PeopleResponse {
     success: boolean;
     data: Person[];
     pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

interface PersonFormValues {
     fullName: string;
     email?: string;
     phoneNumber?: string;
     position?: string;
     department?: string;
     userId?: string;
     isActive?: boolean;
}

function apiError(error: unknown, fallback: string) {
     if (axios.isAxiosError(error)) return error.response?.data?.error || fallback;
     return fallback;
}

export default function PeoplePage() {
     const [form] = Form.useForm<PersonFormValues>();
     const [people, setPeople] = useState<Person[]>([]);
     const [accounts, setAccounts] = useState<Account[]>([]);
     const [loading, setLoading] = useState(true);
     const [saving, setSaving] = useState(false);
     const [modalOpen, setModalOpen] = useState(false);
     const [editing, setEditing] = useState<Person | null>(null);
     const [search, setSearch] = useState("");
     const [includeInactive, setIncludeInactive] = useState(false);
     const [page, setPage] = useState(1);
     const [pagination, setPagination] = useState({ total: 0, pageSize: 20 });

     const loadPeople = useCallback(async () => {
          setLoading(true);
          try {
               const response = await axios.get<PeopleResponse>("/api/people", {
                    params: {
                         page,
                         pageSize: pagination.pageSize,
                         search: search || undefined,
                         includeInactive,
                    },
               });
               if (response.data.success) {
                    setPeople(response.data.data);
                    setPagination((current) => ({
                         ...current,
                         total: response.data.pagination.total,
                         pageSize: response.data.pagination.pageSize,
                    }));
               }
          } catch (error) {
               message.error(apiError(error, "Không thể tải danh sách hồ sơ nhân sự"));
               setPeople([]);
          } finally {
               setLoading(false);
          }
     }, [includeInactive, page, pagination.pageSize, search]);

     useEffect(() => {
          void loadPeople();
     }, [loadPeople]);

     const loadAccounts = async (personId?: string) => {
          try {
               const response = await axios.get<{ success: boolean; data: Account[] }>("/api/people/accounts", {
                    params: personId ? { personId } : undefined,
               });
               if (response.data.success) setAccounts(response.data.data);
          } catch (error) {
               message.error(apiError(error, "Không thể tải danh sách tài khoản"));
               setAccounts([]);
          }
     };

     const openCreate = async () => {
          setEditing(null);
          form.resetFields();
          form.setFieldsValue({ isActive: true });
          await loadAccounts();
          setModalOpen(true);
     };

     const openEdit = async (person: Person) => {
          setEditing(person);
          form.setFieldsValue({
               fullName: person.fullName,
               email: person.email || undefined,
               phoneNumber: person.phoneNumber || undefined,
               position: person.position || undefined,
               department: person.department || undefined,
               userId: person.userId || undefined,
               isActive: person.isActive,
          });
          await loadAccounts(person.id);
          setModalOpen(true);
     };

     const closeModal = () => {
          setModalOpen(false);
          setAccounts([]);
          form.resetFields();
     };

     const savePerson = async () => {
          try {
               const values = await form.validateFields();
               setSaving(true);
               const payload = {
                    ...values,
                    email: values.email?.trim() || null,
                    phoneNumber: values.phoneNumber?.trim() || null,
                    position: values.position?.trim() || null,
                    department: values.department?.trim() || null,
                    userId: values.userId || null,
               };
               if (editing) {
                    await axios.put(`/api/people/${editing.id}`, payload);
                    message.success("Đã cập nhật hồ sơ nhân sự");
               } else {
                    await axios.post("/api/people", payload);
                    message.success("Đã tạo hồ sơ nhân sự");
               }
               closeModal();
               await loadPeople();
          } catch (error) {
               if (error && typeof error === "object" && "errorFields" in error) return;
               message.error(apiError(error, "Không thể lưu hồ sơ nhân sự"));
          } finally {
               setSaving(false);
          }
     };

     const deactivate = async (person: Person) => {
          try {
               await axios.delete(`/api/people/${person.id}`);
               message.success(`Đã ngừng hoạt động hồ sơ ${person.fullName}`);
               await loadPeople();
          } catch (error) {
               message.error(apiError(error, "Không thể ngừng hoạt động hồ sơ"));
          }
     };

     const columns: ColumnsType<Person> = [
          {
               title: "Hồ sơ nhân sự",
               key: "person",
               render: (_: unknown, person: Person) => (
                    <Space direction="vertical" size={0}>
                         <Text strong>{person.fullName}</Text>
                         <Text type="secondary">{person.email || "Chưa có email"}</Text>
                    </Space>
               ),
          },
          {
               title: "Liên kết đăng nhập",
               key: "account",
               render: (_: unknown, person: Person) =>
                    person.account ? (
                         <Space direction="vertical" size={0}>
                              <Tag color="blue" icon={<LinkOutlined />}>Có tài khoản</Tag>
                              <Text type="secondary">{person.account.email}</Text>
                         </Space>
                    ) : (
                         <Tag icon={<UserOutlined />}>Cộng tác viên — chưa có tài khoản</Tag>
                    ),
          },
          {
               title: "Đơn vị / chức vụ",
               key: "organization",
               render: (_: unknown, person: Person) => (
                    <Space direction="vertical" size={0}>
                         <Text>{person.position || "—"}</Text>
                         <Text type="secondary">{person.department || "—"}</Text>
                    </Space>
               ),
          },
          {
               title: "Điện thoại",
               dataIndex: "phoneNumber",
               key: "phoneNumber",
               responsive: ["lg"],
               render: (value: string | null) => value || "—",
          },
          {
               title: "Trạng thái",
               key: "isActive",
               width: 150,
               render: (_: unknown, person: Person) => (
                    <Tag color={person.isActive ? "success" : "default"}>
                         {person.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </Tag>
               ),
          },
          {
               title: "Thao tác",
               key: "actions",
               width: 150,
               render: (_: unknown, person: Person) => (
                    <Space>
                         <Button type="link" icon={<EditOutlined />} onClick={() => void openEdit(person)}>
                              Sửa
                         </Button>
                         {person.isActive && (
                              <Popconfirm
                                   title="Ngừng hoạt động hồ sơ này?"
                                   description="Lịch sử hồ sơ vẫn được giữ lại."
                                   okText="Ngừng hoạt động"
                                   cancelText="Hủy"
                                   onConfirm={() => void deactivate(person)}
                              >
                                   <Button type="link" danger icon={<StopOutlined />} aria-label={`Ngừng hoạt động ${person.fullName}`} />
                              </Popconfirm>
                         )}
                    </Space>
               ),
          },
     ];

     return (
          <AppLayout>
               <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                         <div>
                              <Title level={4} style={{ marginBottom: 4 }}>Hồ sơ nhân sự</Title>
                              <Text type="secondary">
                                   Quản lý hồ sơ độc lập với tài khoản đăng nhập; cộng tác viên có thể chưa có tài khoản.
                              </Text>
                         </div>
                         <Button type="primary" icon={<PlusOutlined />} onClick={() => void openCreate()}>
                              Thêm hồ sơ
                         </Button>
                    </div>

                    <Card>
                         <Space wrap style={{ marginBottom: 16 }}>
                              <Input.Search
                                   allowClear
                                   placeholder="Tìm theo họ tên, email hoặc đơn vị"
                                   prefix={<SearchOutlined />}
                                   style={{ width: 320, maxWidth: "100%" }}
                                   onSearch={(value) => { setPage(1); setSearch(value.trim()); }}
                                   onChange={(event) => {
                                        if (!event.target.value) { setPage(1); setSearch(""); }
                                   }}
                              />
                              <Checkbox
                                   checked={includeInactive}
                                   onChange={(event) => { setPage(1); setIncludeInactive(event.target.checked); }}
                              >
                                   Hiển thị hồ sơ ngừng hoạt động
                              </Checkbox>
                         </Space>
                         <Table<Person>
                              rowKey="id"
                              columns={columns}
                              dataSource={people}
                              loading={loading}
                              scroll={{ x: 900 }}
                              pagination={{
                                   current: page,
                                   pageSize: pagination.pageSize,
                                   total: pagination.total,
                                   showSizeChanger: true,
                                   showTotal: (total) => `${total} hồ sơ`,
                                   onChange: (nextPage, nextPageSize) => {
                                        setPage(nextPage);
                                        setPagination((current) => ({ ...current, pageSize: nextPageSize }));
                                   },
                              }}
                         />
                    </Card>
               </Space>

               <Modal
                    title={editing ? "Cập nhật hồ sơ nhân sự" : "Thêm hồ sơ nhân sự"}
                    open={modalOpen}
                    onCancel={closeModal}
                    onOk={() => void savePerson()}
                    okText={editing ? "Lưu thay đổi" : "Tạo hồ sơ"}
                    cancelText="Hủy"
                    confirmLoading={saving}
                    destroyOnClose
               >
                    <Form form={form} layout="vertical" requiredMark="optional">
                         <Form.Item
                              label="Họ và tên"
                              name="fullName"
                              rules={[{ required: true, whitespace: true, message: "Vui lòng nhập họ và tên" }]}
                         >
                              <Input maxLength={200} autoFocus />
                         </Form.Item>
                         <Form.Item label="Email liên hệ" name="email" rules={[{ type: "email", message: "Email không hợp lệ" }]}>
                              <Input maxLength={320} inputMode="email" />
                         </Form.Item>
                         <Form.Item label="Điện thoại" name="phoneNumber">
                              <Input maxLength={50} inputMode="tel" />
                         </Form.Item>
                         <Form.Item label="Chức vụ" name="position">
                              <Input maxLength={200} />
                         </Form.Item>
                         <Form.Item label="Đơn vị / phòng ban" name="department">
                              <Input maxLength={200} />
                         </Form.Item>
                         <Form.Item
                              label="Tài khoản đăng nhập"
                              name="userId"
                              extra="Để trống nếu đây là cộng tác viên không cần đăng nhập. Mỗi tài khoản chỉ liên kết với một hồ sơ."
                         >
                              <Select
                                   allowClear
                                   showSearch
                                   optionFilterProp="label"
                                   placeholder="Chưa liên kết tài khoản"
                                   options={accounts.map((account) => ({
                                        value: account.id,
                                        label: `${account.fullName} — ${account.email} (${account.role})`,
                                   }))}
                              />
                         </Form.Item>
                         <Form.Item name="isActive" valuePropName="checked">
                              <Checkbox>Hồ sơ đang hoạt động</Checkbox>
                         </Form.Item>
                    </Form>
               </Modal>
          </AppLayout>
     );
}
