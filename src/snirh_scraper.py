from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from datetime import datetime, date
from typing import Any, Optional

from database import SessionLocal, RiverFlowObservation

def parse_date(date_str: str) -> Optional[date]:
    try:
        return datetime.strptime(date_str, "%d/%m/%Y").date()
    except ValueError:
        return None

def fetch_river_flow(station_code: str = "17G/02H") -> list[dict[str, Any]]:
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    driver = webdriver.Chrome(options=chrome_options)
    
    flow_data: list[dict[str, Any]] = []

    try:
        url = "https://snirh.apambiente.pt/index.php?idMain=1&idItem=1.2"
        driver.get(url)
        
        wait = WebDriverWait(driver, 10)
        station_select = wait.until(EC.presence_of_element_located((By.ID, "estacao")))
        menu = Select(station_select)
        menu.select_by_value(station_code)
        
        wait.until(EC.frame_to_be_available_and_switch_to_it("iframe_info"))
        
        soup_iframe = BeautifulSoup(driver.page_source, "html.parser")
        
        station_name = ""
        river_name = ""
        
        rows = soup_iframe.find_all("tr")
        for row in rows:
            cols = row.find_all("td")
            if len(cols) >= 2:
                header = cols[0].text.strip()
                if "Estação" in header:
                    station_name = cols[1].text.strip()
                elif "Rio" in header:
                    river_name = cols[1].text.strip()

        caudais_link = wait.until(EC.element_to_be_clickable((By.PARTIAL_LINK_TEXT, "Caudais")))
        caudais_link.click()
        
        wait.until(EC.number_of_windows_to_be(2))
        driver.switch_to.window(driver.window_handles[-1])
        
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "table")))
        soup_popup = BeautifulSoup(driver.page_source, "html.parser")
        
        table_rows = soup_popup.find_all("tr")
        
        for row in table_rows:
            cols = [col.text.strip() for col in row.find_all(["td", "th"]) if col.text.strip()]
            
            if len(cols) == 2 and "DATA" not in cols[0]:
                date_str = cols[0]
                flow_str = cols[1]
                
                parsed_date = parse_date(date_str)
                if parsed_date and flow_str:
                    try:
                        flow_rate = float(flow_str.replace(",", "."))
                        flow_data.append({
                            "station_code": station_code,
                            "station_name": station_name,
                            "river_name": river_name,
                            "date": parsed_date,
                            "flow_rate": flow_rate
                        })
                    except ValueError:
                        continue
                        
    except Exception as e:
        print(f"Error while fetching data: {e}")
    finally:
        driver.quit()

    return flow_data

def save_flow_data_to_db(flow_data: list[dict[str, Any]]) -> None:
    if not flow_data:
        print("No data to save.")
        return

    db = SessionLocal()
    try:
        new_records_count = 0
        for data in flow_data:
            existing = db.query(RiverFlowObservation).filter(
                RiverFlowObservation.station_code == data["station_code"],
                RiverFlowObservation.date == data["date"]
            ).first()
            
            if not existing:
                observation = RiverFlowObservation(
                    station_code=data["station_code"],
                    station_name=data["station_name"],
                    river_name=data["river_name"],
                    flow_rate=data["flow_rate"],
                    date=data["date"]
                )
                db.add(observation)
                new_records_count += 1
                
        db.commit()
        print(f"Successfully saved {new_records_count} new river flow records to the database.")
    except Exception as e:
        db.rollback()
        print(f"Database error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    data = fetch_river_flow("17G/02H")
    print(f"Extracted {len(data)} records. Saving to database.")
    save_flow_data_to_db(data)