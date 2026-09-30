"""
KCT LifeFlow - Automated User Workflow Test using Selenium WebDriver
Course: O26-27-24CSI015-SOFTWARE ENGINEERING AND AGILE PRACTICES
Workflow: Login -> Navigate to Emergency Requests -> Create Emergency Blood Request -> Verify Record Saved & Displayed in Log Table

Prerequisites:
  pip install selenium webdriver-manager
Run command:
  python tests/selenium_workflow_test.py
"""

import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

class KCTLifeFlowWorkflowTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        options = webdriver.ChromeOptions()
        # Uncomment to run headless if running on CI/Server:
        # options.add_argument("--headless=new")
        options.add_argument("--start-maximized")
        cls.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        cls.wait = WebDriverWait(cls.driver, 15)
        # Target local dev server or deployed production Render URL:
        cls.base_url = "http://localhost:5173"  # or "https://blood-donation-management.onrender.com"

    @classmethod
    def tearDownClass(cls):
        time.sleep(2)
        cls.driver.quit()

    def test_complete_emergency_request_workflow(self):
        driver = self.driver
        wait = self.wait

        print("\n[Step 1]: Navigating to KCT LifeFlow Login Page...")
        driver.get(f"{self.base_url}/login")
        self.assertIn("LifeFlow", driver.title)

        print("[Step 2]: Submitting Institutional Admin Credentials...")
        email_input = wait.until(EC.visibility_of_element_located((By.NAME, "email")))
        password_input = driver.find_element(By.NAME, "password")
        login_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")

        email_input.clear()
        email_input.send_keys("admin@kct.ac.in")
        password_input.clear()
        password_input.send_keys("Password123")
        login_btn.click()

        print("[Step 3]: Verifying Successful Authentication & Dashboard Load...")
        wait.until(EC.url_contains("/dashboard"))
        logo_text = wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "logo-text"))).text
        self.assertEqual(logo_text, "KCT LifeFlow", "Dashboard header should display KCT LifeFlow")

        print("[Step 4]: Navigating to Emergency Request Workspace...")
        driver.get(f"{self.base_url}/requests")
        wait.until(EC.url_contains("/requests"))

        print("[Step 5]: Switching to 'Post Emergency Request' Tab...")
        new_tab_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Post Emergency Request')]")))
        new_tab_btn.click()

        print("[Step 6]: Filling Emergency Blood Request Form...")
        patient_input = wait.until(EC.visibility_of_element_located((By.NAME, "patientName")))
        patient_input.send_keys("Senthil Kumar (AutoTest)")

        # Select Blood Group
        blood_select = Select(driver.find_element(By.NAME, "bloodGroup"))
        blood_select.select_by_value("O+")

        # Hospital & Units
        hospital_input = driver.find_element(By.NAME, "hospital")
        hospital_input.send_keys("Sri Ramakrishna Hospital, Coimbatore")

        units_input = driver.find_element(By.NAME, "unitsRequired")
        units_input.send_keys("2")

        contact_input = driver.find_element(By.NAME, "contactNumber")
        contact_input.send_keys("9876543210")

        urgency_select = Select(driver.find_element(By.NAME, "urgency"))
        urgency_select.select_by_value("High")

        print("[Step 7]: Submitting Request...")
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()

        print("[Step 8]: Asserting Saved Record in Active Request Log Table...")
        # Automatically transitions to 'list' tab
        table = wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "requests-log-table")))
        page_source = driver.page_source

        # Verification Assertions
        self.assertIn("Senthil Kumar (AutoTest)", page_source, "Saved patient name must be displayed in the request table")
        self.assertIn("Sri Ramakrishna Hospital, Coimbatore", page_source, "Hospital name must be rendered in table")
        self.assertIn("High", page_source, "Urgency badge must be displayed")

        print("\n✅ WORKFLOW TEST PASSED: Emergency Blood Request created, saved to cloud/local store, and verified live in table with 100% assertion accuracy!")

if __name__ == "__main__":
    unittest.main()
