# Tools and prompts

The Figma MCP server provides the following tools:

- [`generate_figma_design`](#generate_figma_design) (Claude Code only, remote only): Generates design layers from interfaces
- [`get_design_context`](#get_design_context): Get the design context for a layer or selection
- [`get_variable_defs`](#get_variable_defs): Returns the variables and styles used in your Figma selection
- [`get_code_connect_map`](#get_code_connect_map): Retrieves a mapping between Figma node IDs and their corresponding code components in your codebase
- [`add_code_connect_map`](#add_code_connect_map): Adds a mapping between a Figma node ID and its corresponding code component in your codebase
- [`get_screenshot`](#get_screenshot): Allows the agent to take a screenshot of your selection
- [`create_design_system_rules`](#create_design_system_rules): Creates a rule file that provide agents with the right context to translate designs into frontend code
- [`get_metadata`](#get_metadata): Returns a sparse XML representation of your selection that contains basic properties such as layer IDs, names, types, position and sizes
- [`get_figjam`](#get_figjam): Converts FigJam diagrams (such as app architecture workflows) to XML
- [`generate_diagram`](#generate_diagram): Generates a FigJam diagram from Mermaid syntax
- [`whoami`](#whoami-remote-only) (remote only): Returns the identity of the user that's authenticated to Figma
- [`get_code_connect_suggestions`](#get_code_connect_suggestions): A Figma-prompted tool call to find suggestions for mapping Figma node IDs to their corresponding code components in your codebase using Code Connect
- [`send_code_connect_mappings`](#send_code_connect_mappings): A Figma-prompted tool used after calling `get_code_connect_suggestions` to confirm the suggested Code Connect mappings

## generate_figma_design

:::note
**Note**: Claude Code only. Remote Figma MCP server only.
:::

**Supported file types:** Figma Design

`generate_figma_design` is a tool used for Claude Code to Figma. By prompting the Figma MCP server in Claude Code, you send UI as design layers to:

* New Figma Design files
* Existing Figma Design files
* Your clipboard

`generate_figma_design` respects your seat type when creating or editing files. New files are created in your team or organization drafts. For existing files, you must have edit permissions for the file.

To get started:

1. [Set up the remote Figma MCP server.](remote-server-installation.md) Follow the steps for Claude Code.
2. Prompt Claude to capture your interface. For example:
   * To a new file: “Start a local server for my app and capture the UI in a new Figma file.”
   * To an existing file: “Start a local server for my app and capture the UI in \<Figma file URL\>.” If the URL doesn’t correspond to a Figma Design file, the agent defaults to creating a new file instead.
   * To your clipboard: “Start a local server for my app and capture the UI to my clipboard.”

   Claude should start the server, inject the necessary script for Claude Code to Figma, and open a browser window. For new files Claude will ask you what Figma organization or team you want to use for the capture.

     An initial capture happens when the browser window first opens.

3. In the browser window, use the Claude Code to Figma toolbar to capture specific parts of the UI and different states:
   * Click **Entire screen** to capture the current full state of your interface.
   * Click **Select element** to capture a specific element in the interface.
4. When you’re done capturing your UI:
   * If you’re capturing UI to a Figma Design file, click **Open file**.
   * If you’re capturing UI to your clipboard, paste the design layers into a Figma file of your choice.
   * You can also prompt your agent to complete the process.

**Tips:**

* If you or Claude have already started a local server, you can exclude the “Start a local server for my app…” portion of the example prompts. Generally, Claude may infer that a local server needs to be available, but it can help to be specific the first time.
* If you’re capturing UI multiple times in a conversation, Claude can often infer that you want the UI captured to the same file.

  For example, suppose you’re capturing the interface of a site with multiple pages. If you prompt “Capture the login page to \<an existing Figma Design file URL\>,” you can subsequently prompt things like “Capture checkout to the same file” or even simply, “Also capture the account screen.”

  Generally, Claude will know you want to use the same Figma file, or will you ask you to confirm.
* When you’re capturing UI to an existing file, Claude can suggest recent files you’ve created or edited as options.
* If you’re trying to capture your UI from a live web app or site, you can prompt Claude to use a tool like Playwright to inject the Claude Code to Figma script. For local UI, this isn’t necessary.

## get_design_context

**Supported file types:** Figma Design, Figma Make

Use the MCP server to get the [design context](server-returning-web-code.md#about-the-get_design_context-tool) for a layer or your selection in Figma. By default, the output is **React + Tailwind**, but you can customize it through your prompt.

**Suggested prompts:**

- **Change the framework**
  - `generate my Figma selection in Vue`
  - `generate my Figma selection in plain HTML + CSS`
  - `generate my Figma selection in iOS`
- **Use your components**
  - `generate my Figma selection using components from src/components/ui`
  - \*Tip: set up Code Connect for best code reuse results. Code Connect lets you set up multiple connections per Figma Library. You can map, for example, both your React and SwiftUI code to your Figma components. The Desktop MCP server will use the Code Connect mapping you have selected in Dev Mode. To control which Code Connect mappings are sent via the Remote MCP Server, instruct your agent to set the `clientFrameworks` tool call paramater to the exact Code Connect label you have set up for your mappings, e.g.. `React`, `SwiftUI`.
- **Combine both**
  - `generate my Figma selection using components from src/ui and style with Tailwind`

:::note
**Note:** Selection-based prompting only works with the desktop MCP server. The remote server requires a link to a frame or layer to extract context.
:::

## get_variable_defs

**Supported file types:** Figma Design

Returns the variables and styles used in your Figma selection (such as colors, spacing, typography).

**You can ask it to:**

- **List all tokens used**
  - `get the variables used in my Figma selection`
- **Focus on a specific type**
  - `what color and spacing variables are used in my Figma selection?`
- **Get both names and values**
  - `list the variable names and their values used in my Figma selection`

## get_code_connect_map

**Supported file types:** Figma Design

Retrieves a mapping between Figma node IDs and their corresponding code components in your codebase. Specifically, it returns an object where each key is a Figma node ID, and the value contains:

- `codeConnectSrc`: The location of the component in your codebase (e.g., a file path or URL).
- `codeConnectName`: The name of the component in your codebase.

This mapping is used to connect Figma design elements directly to their React (or other framework) implementations, enabling seamless design-to-code workflows and ensuring that the correct components are used for each part of the design. If a Figma node is connected to a code component, this function helps you identify and use the exact component in your project.

## add_code_connect_map

**Supported file types:** Figma Design

Adds a mapping between a Figma node ID and its corresponding code component in your codebase. Setting up these mappings will improve the output quality of design-to-code worksflows and help you identify and use the exact component in your project.

## get_screenshot

**Supported file types:** Figma Design, FigJam

Allows the agent to take a screenshot of your selection. This helps preserve layout fidelity in the generated code. Recommended to keep on (only turn off if you're concerned about token limits).

## create_design_system_rules

**Supported file types:** No file context required

A tool for creating a rule file that provide agents with the right context to translate designs into high-quality, codebase-aware frontend code. It helps ensure alignment with your design system and tech stack, improving the relevance and accuracy of generated output.

Run this tool and make sure the result is saved to the correct `rules/` or `instructions/` path so your agent can access it during code generation.

## get_metadata

**Supported file types:** Figma Design

Returns a sparse XML representation of your selection containing just basic properties such as the layer IDs, names, types, position and sizes. This is an outline that your Agent can then break down and call `get_design_context` on to retrieve only the styling information of the design it needs. Useful for very large designs where `get_design_context` produces output with a large context size. It also works with multiple selections or the whole page if you don't select anything.

## get_figjam

**Supported file types:** FigJam

This tool returns metadata for FigJam diagrams in XML format, similar to `get_metadata`. In addition to returning basic properties like layer IDs, names, types, positions, and sizes, it also includes screenshots of the nodes.

## generate_diagram

**Supported file types:** No file context required

Generates a FigJam diagram from Mermaid syntax. This tool accepts Mermaid diagram definitions and converts them into interactive FigJam diagrams that can be edited and shared.

You do not have to provide Mermaid syntax yourself. Instead, you can prompt the agent to create diagrams by describing the desired diagram in natural language. The agent will then generate the appropriate Mermaid syntax and use the generate_diagram tool to create the FigJam diagram.

To ensure that the agent uses the Figma MCP `generate_diagram` tool, you can include the directive "Use the Figma MCP generate_diagram tool" in your prompt. However, the agent will likely use the tool automatically when it determines that a diagram is needed based on your request.

**Supported diagram types:**

- Flowchart
- Gantt chart
- State diagram
- Sequence diagram

**Suggested prompts:**

- **Generate a diagram from a description**
  - `create a flowchart for the user authentication flow using the Figma MCP generate_diagram tool`
  - `generate a gantt chart for the project timeline using the Figma MCP generate_diagram tool`
  - `generate a sequence diagram for the payment processing system using the Figma MCP generate_diagram tool`
- **Convert existing Mermaid syntax**
  - `create a diagram from this mermaid syntax: ...`

## whoami (remote only)

**Supported file types:** No file context required

This tool returns the identity of the user that's authenticated to Figma, including:

- The user's email address
- All of the plans the user belongs to
- The seat type the user has on each plan

## get_code_connect_suggestions

**Supported file types:** Figma Design

A tool call prompted by Figma to detect and suggest mappings of Figma components to code components in your codebase using Code Connect.

## send_code_connect_mappings

**Supported file types:** Figma Design

A tool call prompted by Figma to confirm the Code Connect mappings after calling `get_code_connect_suggestions`.
