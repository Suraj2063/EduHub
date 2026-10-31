const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/schema/userSchema");
const Resource = require("./src/schema/resourceSchema");
const connectToDb = require("./src/connectToDb");

const seedDatabase = async () => {
  try {
    await connectToDb();

    // Clear existing sample data if any
    await Resource.deleteMany({});
    await User.deleteMany({});

    console.log("🧹 Cleared old data");

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create sample student accounts
    const user1 = await User.create({
      name: "Sarah Chen",
      email: "sarah.chen@college.edu",
      password: hashedPassword,
      bio: "CS Junior | TA for Data Structures & Algorithms | Loves Graph Theory",
    });

    const user2 = await User.create({
      name: "Marcus Vance",
      email: "marcus.v@college.edu",
      password: hashedPassword,
      bio: "Mechanical Engineering Senior | Formula Student Team Lead",
    });

    const user3 = await User.create({
      name: "Priya Sharma",
      email: "priya.sharma@college.edu",
      password: hashedPassword,
      bio: "Math & Economics double major | Peer tutor for Calc III & Linear Algebra",
    });

    // Create sample study materials
    const sampleResources = [
      {
        title: "CS 201: Data Structures & Algorithms Complete Midterm Guide",
        subject: "Computer Science",
        fileUrl: "https://drive.google.com/file/d/sample-dsa-notes/view",
        description:
          "Comprehensive review sheet covering asymptotic analysis (Big-O, Big-Omega, Big-Theta), AVL trees, red-black tree rotations, Dijkstra's algorithm, topological sort, and dynamic programming memoization patterns with annotated C++ & Python code examples.",
        uploadedBy: user1._id,
      },
      {
        title: "Calculus III: Vector Calculus & Stokes' Theorem Cheat Sheet",
        subject: "Mathematics",
        fileUrl: "https://drive.google.com/file/d/sample-calc3-sheet/view",
        description:
          "Handwritten summary of 3D coordinates, partial derivatives, Lagrange multipliers, double & triple integrals in cylindrical/spherical coordinates, Green's theorem, Divergence theorem, and Stokes' theorem with solved exam questions.",
        uploadedBy: user3._id,
      },
      {
        title: "Physics 102: Electromagnetism, Maxwell Equations & Optics",
        subject: "Physics",
        fileUrl: "https://drive.google.com/file/d/sample-physics-em/view",
        description:
          "Condensed 12-page guide for Physics II. Includes Gauss's Law step-by-step surface selection, Ampere's Law, Faraday's Law of induction, AC RLC circuits, interference, and diffraction grating formulas with diagram breakdowns.",
        uploadedBy: user2._id,
      },
      {
        title: "ECON 202: Intermediate Microeconomics Exam Preparation",
        subject: "Economics",
        fileUrl: "https://drive.google.com/file/d/sample-microecon/view",
        description:
          "Covers consumer theory (utility maximization, indifference curves), producer theory (cost curves, profit maximization), monopoly pricing, Cournot & Bertrand oligopoly models, and game theory Nash equilibria with step-by-step calculus derivations.",
        uploadedBy: user3._id,
      },
      {
        title: "ENGR 110: Thermodynamics & Heat Transfer Formula Sheet",
        subject: "Engineering",
        fileUrl: "https://drive.google.com/file/d/sample-thermo/view",
        description:
          "First and second laws of thermodynamics, Carnot cycle efficiency, enthalpy and entropy calculations, Otto & Diesel cycles, Rankine vapor cycle, and conduction/convection heat transfer rate equations.",
        uploadedBy: user2._id,
      },
      {
        title: "CHEM 211: Organic Chemistry I Reaction Mechanisms Roadmap",
        subject: "Chemistry",
        fileUrl: "https://drive.google.com/file/d/sample-orgo-mechanisms/view",
        description:
          "Complete color-coded flowcharts for SN1, SN2, E1, and E2 pathways, alkene and alkyne addition reactions, Markovnikov vs anti-Markovnikov regioselectivity, stereochemistry conventions, and common acid/base reagent strengths.",
        uploadedBy: user1._id,
      },
    ];

    await Resource.create(sampleResources);
    console.log(`✅ Seeded ${sampleResources.length} sample resources and 3 demo users!`);
    console.log("Demo credentials: sarah.chen@college.edu / password123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error.message);
    process.exit(1);
  }
};

seedDatabase();
