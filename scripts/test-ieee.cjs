const fs = require("fs");
const path = require("path");
const { assembleIEEEWordDocument } = require("../lib/assembler.ts");

async function testIEEE() {
  console.log("\n==================================================");
  console.log("📄 TESTING IEEE 2-COLUMN RESEARCH PAPER GENERATION");
  console.log("==================================================\n");

  const sampleInput = {
    title: "Deep Reinforcement Learning for Autonomous Grid Storage Dispatch",
    subtitle: "*Note: Sub-titles are not captured in Xplore and should not be used",
    format: "docx",
    docType: "Research Paper",
    isIEEEPaper: true,
    author: "Pradeep H.",
    academicMeta: {
      submittedBy: "Pradeep H.",
      department: "Dept. of Computer Science & Engineering",
      institutionName: "Indian Institute of Technology Madras",
      guideName: "Dr. A. Sharma"
    },
    sections: [
      {
        id: "sec_abstract",
        title: "Abstract & Keywords",
        brief: "Deep reinforcement learning methods for real-time dispatch of battery storage systems in high-renewable power grids.",
        content: `Abstract—This paper presents an autonomous deep reinforcement learning (DRL) framework for multi-timescale battery energy storage dispatch in electrical grids with high renewable energy penetration. By formulating the dispatch problem as a Constrained Markov Decision Process (CMDP) and introducing an adaptive proximal policy optimization algorithm, our architecture dynamically balances supply intermittency and minimizes peak tariff degradation. Empirical evaluation across IEEE 118-bus testbeds demonstrates a 28.4% reduction in curtailment rates and a 3.2x enhancement in voltage stability margins compared to existing linear programming baselines.\n\nKeywords—Battery energy storage systems, deep reinforcement learning, renewable integration, grid stability, CMDP, IEEE standards`
      },
      {
        id: "sec_1",
        title: "I. INTRODUCTION",
        brief: "Introduction to renewable grid challenges and DRL contributions.",
        content: `The global transition toward non-fossil energy generation has accelerated the adoption of utility-scale solar and wind resources [1]. However, the inherent stochasticity and intermittency of renewable generation introduce severe transmission bottlenecks, voltage fluctuations, and frequency deviations [2]. Battery Energy Storage Systems (BESS) represent a pivotal stabilizing asset capable of providing rapid frequency response and peak-load shaving [3].\n\n### A. Motivation and Prior Limitations\nConventional battery dispatch architectures predominantly rely on Model Predictive Control (MPC) and mixed-integer linear programming (MILP). While computationally tractable under deterministic assumptions, these methods exhibit significant performance degradation when subjected to forecast errors exceeding 15% [4].\n\n### B. Principal Contributions\nIn this work, we address these challenges through the following contributions:\n- We formulate the multi-interval battery storage scheduling problem as a continuous-state Constrained Markov Decision Process (CMDP) with safety boundary certificates.\n- We develop an Adaptive Proximal Policy Optimization (APPO) architecture with reward shaping tailored for high-dimensional bus topologies.\n- We validate the framework on standard IEEE 118-bus testbeds, achieving state-of-the-art dispatch efficiency.`
      },
      {
        id: "sec_2",
        title: "II. PROPOSED SYSTEM ARCHITECTURE & FORMULATION",
        brief: "Mathematical formulation and network architecture.",
        content: `### A. Mathematical Formulation\nThe grid state vector s_t at time step t incorporates nodal voltage magnitudes, active/reactive power injections, and state-of-charge (SoC) parameters:\n\n$$\\mathcal{L}_{total} = \\mathbb{E} \\left[ \\sum_{t=0}^{T} \\gamma^t R(s_t, a_t) \\right] - \\lambda \\cdot \\mathcal{C}_{constraint} \\quad (1)$$\n\nwhere gamma in (0, 1) denotes the discount factor and lambda is the Lagrangian penalty multiplier ensuring battery thermal safety limits.\n\n| Algorithm Parameter | Baseline MILP | Proposed APPO | Improvement |\n| :--- | :--- | :--- | :--- |\n| Voltage Deviation (p.u.) | 0.048 | 0.012 | 75.0% |\n| Curtailment Loss (%) | 14.2% | 2.8% | 80.3% |\n| Inference Latency (ms) | 480 ms | 12 ms | 40.0x |`
      },
      {
        id: "sec_3",
        title: "III. EXPERIMENTAL RESULTS & BENCHMARKS",
        brief: "Empirical results and comparative evaluation.",
        content: `The proposed architecture was evaluated on an IEEE 118-bus testbed over 10,000 continuous dispatch episodes. As summarized in Table I, the APPO model achieved superior convergence stability and minimized peak energy losses across all test regimes [5].\n\n#### 1) Ablation on Policy Clipping:\nRemoving policy clipping resulted in a 4.2% increase in variance during extreme weather events, confirming the necessity of normalized advantage estimators [6].`
      },
      {
        id: "sec_4",
        title: "IV. CONCLUSION",
        brief: "Concluding remarks and future research directions.",
        content: `This study demonstrated the efficacy of deep reinforcement learning for real-time battery energy storage dispatch in renewable-heavy power systems. Future work will investigate decentralized multi-agent coordination across cross-border interconnectors.`
      }
    ]
  };

  const buffer = await assembleIEEEWordDocument(sampleInput);
  const outPath = path.join(__dirname, "IEEE_Standard_Research_Paper.docx");
  fs.writeFileSync(outPath, buffer);

  console.log(`✅ IEEE 2-Column Standard Word Document generated successfully!`);
  console.log(`📁 File saved to: ${outPath} (${buffer.length} bytes)`);
}

testIEEE().catch(console.error);
