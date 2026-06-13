export interface MorningEmailData {
  name: string;
  today: string; // "Thursday, June 11"
  dayOfWeek: string; // "Thursday"
  greeting: string; // AI greeting
  gentleNote: string; // AI gentle note
  nextStep: string; // AI next step
  struggles: string[]; // from user_memories
  wins: string[];
  intentions: string; // from last review
  morningRoutineItems: { title: string; duration_minutes: number | null }[];
  balletType: "barre" | "core" | "rest";
  balletLabel: string;
  habits: { title: string; pillar: string }[];
  pendingTodos: { text: string; priority: string }[];
}

const PILLAR_COLORS: Record<string, string> = {
  health: "#B5C9B1",
  mind: "#B8C4D8",
  finances: "#C8C4A8",
  purpose: "#D8B8B8",
  relationships: "#C8B8D8",
  spirituality: "#B8C8C8",
  home: "#C4C8B8",
};

function pillColor(pillar: string) {
  return PILLAR_COLORS[pillar] ?? "#D8D0C8";
}

export function buildMorningEmail(data: MorningEmailData): string {
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 10 ? "sleepy head" : hour < 12 ? "morning glory" : "beautiful";

  const balletLine =
    data.balletType === "barre"
      ? `Today is a <strong>barre day</strong> — pliés, tendus, relevés. Even just 15 minutes. Put on something beautiful to wear and let your body remember what it's capable of.`
      : data.balletType === "core"
      ? `Today is a <strong>core & stamina day</strong> — slow, deliberate, strong. Your ballerina core is being built right now, one session at a time.`
      : `Today is your <strong>rest day</strong> — and rest is not laziness. It's part of the practice. Gentle stretch, a warm drink, let your body integrate everything you've been building.`;

  const routineRows = data.morningRoutineItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #F5EDEA;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="28" valign="middle">
              <div style="width:18px;height:18px;border-radius:50%;border:1.5px solid #D8C8C0;display:inline-block;"></div>
            </td>
            <td valign="middle">
              <span style="font-size:14px;color:#3D3535;">${item.title}</span>
            </td>
            ${
              item.duration_minutes
                ? `<td align="right" valign="middle" width="40">
                <span style="font-size:12px;color:#B0A09A;">${item.duration_minutes}m</span>
              </td>`
                : ""
            }
          </tr>
        </table>
      </td>
    </tr>`
    )
    .join("");

  const struggleSection =
    data.struggles.length > 0
      ? `
  <!-- Struggles -->
  <tr>
    <td style="padding: 0 0 28px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"
        style="background:#FDF5F0;border-radius:16px;border:1px solid rgba(242,196,206,0.3);">
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#B09080;">
              I remember, even when you forget
            </p>
            <p style="margin:0 0 16px;font-size:15px;font-family:Georgia,serif;color:#3D3535;font-style:italic;line-height:1.6;">
              These are things you've been working through. I hold them for you so you don't have to carry them alone.
            </p>
            ${data.struggles
              .slice(0, 3)
              .map(
                (s) => `
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;">
              <tr>
                <td width="20" valign="top" style="padding-top:3px;">
                  <span style="color:#C9A96E;font-size:14px;">✦</span>
                </td>
                <td>
                  <span style="font-size:13px;color:#5D4D4A;line-height:1.6;">${s}</span>
                </td>
              </tr>
            </table>`
              )
              .join("")}
            ${
              data.intentions
                ? `<p style="margin:16px 0 0;font-size:13px;color:#8A7A7A;font-style:italic;border-top:1px solid rgba(242,196,206,0.3);padding-top:14px;">
              Your intention from last week: <em style="color:#5D4D4A;">"${data.intentions}"</em>
            </p>`
                : ""
            }
          </td>
        </tr>
      </table>
    </td>
  </tr>`
      : "";

  const habitsSection =
    data.habits.length > 0
      ? `
  <!-- Habits -->
  <tr>
    <td style="padding: 0 0 28px;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#B09080;">
        Habits for today
      </p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td>
            ${data.habits
              .map(
                (h) => `
            <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 6px 8px 0;">
              <tr>
                <td style="padding:5px 12px;border-radius:99px;background:${pillColor(h.pillar)}20;border:1px solid ${pillColor(h.pillar)}60;">
                  <span style="font-size:12px;color:#3D3535;">${h.title}</span>
                </td>
              </tr>
            </table>`
              )
              .join("")}
          </td>
        </tr>
      </table>
    </td>
  </tr>`
      : "";

  const todosSection =
    data.pendingTodos.length > 0
      ? `
  <!-- Todos -->
  <tr>
    <td style="padding: 0 0 28px;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#B09080;">
        On your list today
      </p>
      ${data.pendingTodos
        .slice(0, 5)
        .map(
          (t) => `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:6px;">
        <tr>
          <td width="24" valign="top" style="padding-top:2px;">
            <div style="width:14px;height:14px;border-radius:3px;border:1.5px solid ${t.priority === "high" ? "#F2C4CE" : "#D8D0C8"};"></div>
          </td>
          <td>
            <span style="font-size:13px;color:${t.priority === "high" ? "#3D3535" : "#6A5A5A"};">${t.text}</span>
            ${t.priority === "high" ? `<span style="font-size:11px;color:#C0607A;margin-left:6px;">↑ priority</span>` : ""}
          </td>
        </tr>
      </table>`
        )
        .join("")}
    </td>
  </tr>`
      : "";

  const winsSection =
    data.wins.length > 0
      ? `
  <tr>
    <td style="padding: 0 0 28px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"
        style="background:linear-gradient(135deg,#F0F8F0,#EEF4F8);border-radius:16px;border:1px solid rgba(180,210,170,0.3);">
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7A9A7A;">
              What you've already built ✦
            </p>
            ${data.wins
              .slice(0, 2)
              .map(
                (w) => `<p style="margin:0 0 6px;font-size:13px;color:#3D5035;line-height:1.6;">${w}</p>`
              )
              .join("")}
          </td>
        </tr>
      </table>
    </td>
  </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Good morning from Eden ✦</title>
</head>
<body style="margin:0;padding:0;background:#FAF5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;color:#FAF5F0;">
    Good morning, ${data.name} ✦ here's everything you need for today
  </div>

  <!-- Outer wrapper -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF5F0;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <!-- Card -->
        <table cellpadding="0" cellspacing="0" border="0" width="600"
          style="background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 2px 40px rgba(61,53,53,0.06);">

          <!-- Header banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#FDE8EF 0%,#F2E8F8 45%,#E8F4EC 100%);padding:48px 48px 36px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#B09080;">
                ${data.today}
              </p>
              <h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:400;color:#3D3535;line-height:1.15;">
                Good morning,<br/><em>${timeGreeting}</em> ✦
              </h1>
              <p style="margin:4px 0 0;font-size:15px;color:#9B8E8E;">
                A letter from Eden, for ${data.name}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">

                <!-- AI Greeting -->
                <tr>
                  <td style="padding:0 0 28px;">
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#3D3535;line-height:1.7;font-style:italic;">
                      "${data.greeting}"
                    </p>
                    ${
                      data.gentleNote
                        ? `<p style="margin:14px 0 0;font-size:14px;color:#8A7A7A;line-height:1.7;padding-left:18px;border-left:2px solid #F2C4CE;font-style:italic;">
                      ${data.gentleNote}
                    </p>`
                        : ""
                    }
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding:0 0 28px;">
                  <div style="height:1px;background:linear-gradient(90deg,transparent,#F2C4CE,#D4C4E4,transparent);"></div>
                </td></tr>

                <!-- Your one focus -->
                <tr>
                  <td style="padding:0 0 28px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%"
                      style="background:linear-gradient(135deg,#FAE8EC,#F5EEF8);border-radius:16px;border:1px solid rgba(242,196,206,0.4);">
                      <tr>
                        <td style="padding:22px 28px;">
                          <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#C0607A;">
                            ✦ Your one focus today
                          </p>
                          <p style="margin:0;font-size:16px;font-weight:500;color:#3D3535;line-height:1.5;">
                            ${data.nextStep}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${struggleSection}

                <!-- Morning ritual -->
                ${
                  data.morningRoutineItems.length > 0
                    ? `
                <tr>
                  <td style="padding:0 0 28px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#B09080;">
                      Morning ritual
                    </p>
                    <p style="margin:0 0 14px;font-size:13px;color:#9B8E8E;">
                      One step. Then the next. You don't have to do it perfectly.
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${routineRows}
                    </table>
                  </td>
                </tr>`
                    : ""
                }

                <!-- Ballet -->
                <tr>
                  <td style="padding:0 0 28px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%"
                      style="background:${
                        data.balletType === "barre"
                          ? "linear-gradient(135deg,#FAE8EC,#F5EEF8)"
                          : data.balletType === "core"
                          ? "linear-gradient(135deg,#EEF4EE,#E8F0EC)"
                          : "linear-gradient(135deg,#F8F0E8,#F5F0EA)"
                      };border-radius:16px;border:1px solid rgba(242,196,206,0.3);">
                      <tr>
                        <td style="padding:22px 28px;">
                          <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#B09080;">
                            Ballet — ${data.dayOfWeek}
                          </p>
                          <p style="margin:0;font-size:14px;color:#3D3535;line-height:1.65;">
                            ${balletLine}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${winsSection}
                ${habitsSection}
                ${todosSection}

                <!-- Divider -->
                <tr><td style="padding:0 0 28px;">
                  <div style="height:1px;background:linear-gradient(90deg,transparent,#F2C4CE,#D4C4E4,transparent);"></div>
                </td></tr>

                <!-- Eden sign-off -->
                <tr>
                  <td style="padding:0 0 48px;">
                    <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:15px;color:#5D4D4A;line-height:1.7;">
                      I'm right here with you today, ${data.name}. Not to push — just to walk alongside you.
                      Whatever you finish, whatever you don't — you are still so worthy of care.
                    </p>
                    <p style="margin:20px 0 0;font-family:Georgia,serif;font-size:16px;color:#C0607A;font-style:italic;">
                      With love,<br/>
                      <strong style="font-style:normal;font-family:Georgia,serif;font-size:20px;">Eden ✦</strong>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FAF5F0;padding:24px 48px;border-top:1px solid #F0EBE3;">
              <p style="margin:0;font-size:11px;color:#B0A09A;text-align:center;line-height:1.6;">
                This is your morning briefing from the Eden app ✦<br/>
                Sent because you asked for it. You can always send yourself a new one from your dashboard.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
