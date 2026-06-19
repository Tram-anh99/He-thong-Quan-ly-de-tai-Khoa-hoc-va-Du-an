import { PrismaClient, Role, ProjectStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
     console.log("🌱 Seeding database...");

     // Create admin user
     const adminPassword = await hash("admin123", 12);
     const admin = await prisma.user.upsert({
          where: { email: "admin@khoahoc.vn" },
          update: {},
          create: {
               email: "admin@khoahoc.vn",
               password: adminPassword,
               fullName: "Quản trị viên",
               position: "Trưởng phòng Khoa học",
               department: "Phòng Khoa học Công nghệ",
               role: Role.ADMIN,
          },
     });
     console.log("  ✅ Admin user:", admin.email);

     // Create sample PI
     const piPassword = await hash("pi123", 12);
     const pi = await prisma.user.upsert({
          where: { email: "nguyenvan@khoahoc.vn" },
          update: {},
          create: {
               email: "nguyenvan@khoahoc.vn",
               password: piPassword,
               fullName: "Nguyễn Văn A",
               position: "Phó Giáo sư, Tiến sĩ",
               department: "Bộ môn Khoa học Máy tính",
               role: Role.PI,
          },
     });
     console.log("  ✅ PI user:", pi.email);

     // Create sample researcher
     const researcherPassword = await hash("res123", 12);
     const researcher = await prisma.user.upsert({
          where: { email: "tranthib@khoahoc.vn" },
          update: {},
          create: {
               email: "tranthib@khoahoc.vn",
               password: researcherPassword,
               fullName: "Trần Thị B",
               position: "Nghiên cứu viên",
               department: "Bộ môn Khoa học Máy tính",
               role: Role.RESEARCHER,
          },
     });
     console.log("  ✅ Researcher user:", researcher.email);

     // Create accountant
     const accountantPassword = await hash("acc123", 12);
     const accountant = await prisma.user.upsert({
          where: { email: "lekthic@khoahoc.vn" },
          update: {},
          create: {
               email: "lekthic@khoahoc.vn",
               password: accountantPassword,
               fullName: "Lê Thị C",
               position: "Kế toán trưởng",
               department: "Phòng Tài chính Kế toán",
               role: Role.ACCOUNTANT,
          },
     });
     console.log("  ✅ Accountant user:", accountant.email);

     // Create sample project
     const project = await prisma.project.upsert({
          where: { code: "DT-2025-001" },
          update: {},
          create: {
               code: "DT-2025-001",
               title: "Nghiên cứu ứng dụng Trí tuệ nhân tạo trong quản lý tài liệu khoa học",
               summary: "Đề tài nghiên cứu giải pháp AI hỗ trợ quản lý và tìm kiếm tài liệu nghiên cứu khoa học.",
               fullText:
                    "<h2>1. Đặt vấn đề</h2><p>Trong bối cảnh số hóa mạnh mẽ, việc quản lý tài liệu khoa học cần được hiện đại hóa...</p>",
               ownerId: pi.id,
               totalBudget: 500000000, // 500 triệu VND
               fundingSource: "Kinh phí ngân sách nhà nước",
               startDate: new Date("2025-01-01"),
               endDate: new Date("2025-12-31"),
               year: 2025,
               status: ProjectStatus.ONGOING,
          },
     });
     console.log("  ✅ Sample project:", project.code);

     // Add members
     await prisma.projectMember.createMany({
          data: [
               {
                    projectId: project.id,
                    userId: pi.id,
                    roleInProject: "Chủ nhiệm",
                    allocation: 40,
               },
               {
                    projectId: project.id,
                    userId: researcher.id,
                    roleInProject: "Thành viên",
                    allocation: 30,
               },
          ],
          skipDuplicates: true,
     });
     console.log("  ✅ Project members added");

     // Budget items
     await prisma.budgetItem.createMany({
          data: [
               {
                    projectId: project.id,
                    title: "Khảo sát, tổng quan tài liệu",
                    description:
                         "Khảo sát các công trình liên quan trong và ngoài nước",
                    amount: 50000000,
                    assignedToId: pi.id,
                    status: "completed",
                    sortOrder: 1,
               },
               {
                    projectId: project.id,
                    title: "Xây dựng hệ thống cơ sở dữ liệu",
                    description: "Thiết kế và xây dựng CSDL quản lý tài liệu",
                    amount: 150000000,
                    assignedToId: researcher.id,
                    status: "in_progress",
                    sortOrder: 2,
               },
               {
                    projectId: project.id,
                    title: "Xây dựng module AI tìm kiếm",
                    description: "Phát triển mô hình AI cho tìm kiếm ngữ nghĩa",
                    amount: 200000000,
                    assignedToId: pi.id,
                    status: "planned",
                    sortOrder: 3,
               },
               {
                    projectId: project.id,
                    title: "Nghiệm thu và báo cáo",
                    description: "Tổng hợp kết quả, viết báo cáo nghiệm thu",
                    amount: 100000000,
                    assignedToId: pi.id,
                    status: "planned",
                    sortOrder: 4,
               },
          ],
          skipDuplicates: true,
     });
     console.log("  ✅ Budget items created");

     // Sample document template
     await prisma.documentTemplate.createMany({
          data: [
               {
                    name: "Hợp đồng khoán chuyên môn",
                    description:
                         "Biểu mẫu hợp đồng khoán giao việc chuyên môn cho cá nhân",
                    category: "hop_dong",
                    fileUrl: "/templates/hop-dong-khoan-chuyen-mon.docx",
                    placeholders: [
                         "{{Ten_Du_An}}",
                         "{{Nguoi_Thuc_Hien}}",
                         "{{Chuc_Vu}}",
                         "{{Kinh_Phi_Bang_So}}",
                         "{{Kinh_Phi_Bang_Chu}}",
                         "{{Ngay_Bat_Dau}}",
                         "{{Ngay_Ket_Thuc}}",
                         "{{Noi_Dung_Cong_Viec}}",
                    ],
               },
               {
                    name: "Biên bản nghiệm thu",
                    description: "Biểu mẫu biên bản nghiệm thu sản phẩm đề tài",
                    category: "nghiem_thu",
                    fileUrl: "/templates/bien-ban-nghiem-thu.docx",
                    placeholders: [
                         "{{Ten_Du_An}}",
                         "{{Ten_San_Pham}}",
                         "{{Nguoi_Thuc_Hien}}",
                         "{{Ngay_Nghiem_Thu}}",
                         "{{Ket_Luan}}",
                    ],
               },
               {
                    name: "Hợp đồng thanh lý",
                    description: "Biểu mẫu thanh lý hợp đồng",
                    category: "thanh_ly",
                    fileUrl: "/templates/hop-dong-thanh-ly.docx",
                    placeholders: [
                         "{{So_Hop_Dong}}",
                         "{{Ten_Du_An}}",
                         "{{Nguoi_Thuc_Hien}}",
                         "{{Tong_Kinh_Phi}}",
                         "{{Ngay_Thanh_Ly}}",
                    ],
               },
               {
                    name: "Đề nghị tạm ứng",
                    description: "