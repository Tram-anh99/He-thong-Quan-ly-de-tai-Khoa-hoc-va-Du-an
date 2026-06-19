"use client";

import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, message, Space } from "antd";
import {
     UserOutlined,
     LockOutlined,
     ExperimentOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import axios from "axios";

const { Title, Text } = Typography;

export default function LoginPage() {
     const [loading, setLoading] = useState(false);
     const router = useRouter();

     const onFinish = async (values: { email: string; password: string }) => {
          setLoading(true);
          try {
               const res = await axios.post("/api/auth/login", values);
               if (res.data.success) {
                    message.success("Đăng nhập thành công!");
                    router.push("/");
               } else {
                    message.error(res.data.error || "Đăng nhập thất bại");
               }
          } catch (err: any) {
               message.error(err.response?.data?.error || "Đăng nhập thất bại");
          } finally {
               setLoading(false);
          }
     };

     return (
          <div
               style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                         "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)",
               }}
          >
               <Card
                    style={{
                         width: 420,
                         borderRadius: 12,
                         boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    }}
                    styles={{ body: { padding: "40px 32px" } }}
               >
                    <Space
                         direction="vertical"
                         size="large"
                         style={{ width: "100%", textAlign: "center" }}
                    >
                         <div>
                              <ExperimentOutlined
                                   style={{ fontSize: 48, color: "#1677ff" }}
                              />
                              <Title
                                   level={3}
                                   style={{ marginTop: 12, marginBottom: 4 }}
                              >
                                   Hệ thống Quản lý Đề tài
                              </Title>
                              <Text type="secondary">Khoa học và Dự án</Text>
                         </div>

                         <Form
                              name="login"
                              onFinish={onFinish}
                              layout="vertical"
                              size="large"
                              style={{ textAlign: "left" }}
                         >
                              <Form.Item
                                   name="email"
                                   rules={[
                                        {
                                             required: true,
                                             message: "Vui lòng nhập email",
                                        },
                                        {
                                             type: "email",
                                             message: "Email không hợp lệ",
                                        },
                                   ]}
                              >
                                   <Input
                                        prefix={<UserOutlined />}
                                        placeholder="Email"
                                        autoComplete="email"
                                   />
                              </Form.Item>

                              <Form.Item
                                   name="password"
                                   rules={[
                                        {
                                             required: true,
                                             message: "Vui lòng nhập mật khẩu",
                                        },
                                   ]}
                              >
                                   <Input.Password
                                        prefix={<LockOutlined />}
                                        placeholder="Mật khẩu"
                                        autoComplete="current-password"
                                   />
                              </Form.Item>

                              <Form.Item style={{ marginBottom: 0 }}>
                                   <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading}
                                        block
                                   >
                                        Đăng nhập
                                   </Button>
                              </Form.Item>
                         </Form>

                         <Text type="secondary" style={{ fontSize: 12 }}>
                              Demo: admin@khoahoc.vn / admin123
                         </Text>
                    </Space>
               </Card>
          </div>
     );
}
