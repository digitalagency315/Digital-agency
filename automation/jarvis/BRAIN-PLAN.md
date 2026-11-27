# Jarvis ka naya brain (Option C: free + online)

Kaise chalega:
- **Roz ke chhote kaam** → free brain, Mac pe (Ollama, model `qwen3:8b`). Koi paisa nahi, koi limit nahi.
- **Mushkil sawaal** → online brain (Claude API). Har sawaal ka thoda paisa lagta hai.

> OpenJarvis me "apne aap easy/hard pehchan ke brain badalna" (auto routing) abhi nahi hai (docs me likha hai).
> Isliye 2 shortcut: `j` = free brain, `jpro` = online brain.

## Mac pe karne wale steps (Local Claude session isko follow karega)
Har command se pehle `jarvis --help` / `jarvis <command> --help` se check karna.

1. Check: `jarvis doctor`, `jarvis config path`, `jarvis model list`
2. Free brain:
   - Mac ki RAM dekho (`sysctl hw.memsize`). 8 GB → `qwen3:4b`, 16 GB+ → `qwen3:8b`.
   - `jarvis model pull qwen3:8b`
   - `~/.openjarvis/config.toml` me: `[intelligence] default_model = "qwen3:8b"`, `[engine] default = "ollama"` (pehle file ka backup).
   - Test: `jarvis ask "Who are you?"`
3. Online brain:
   - Anthropic API key (console.anthropic.com). Yeh Claude app ki subscription se **alag** hai, alag bill.
   - Key sirf Mac ke Keychain/`~/.zshrc` me `ANTHROPIC_API_KEY`. Kabhi chat ya GitHub pe nahi.
   - Cloud engine ke packages: `jarvis doctor` jo bataye wahi install.
   - Test: `jarvis ask -m claude-haiku-5-5 "Who are you?"` (sasta). Bahut mushkil kaam: `claude-sonnet-5-5`.
4. Shortcuts `~/.zshrc` me:
   ```bash
   alias j='jarvis ask'
   alias jpro='jarvis ask -m claude-haiku-5-5'
   ```
5. Kharcha limit: Anthropic console me monthly spend limit (jaise $5) set karna.

## Pakke rules
- Paisa, message, email, post, delete: sirf owner ke "haan" ke baad.
- Staff ka personal data online brain ko nahi bhejna.
